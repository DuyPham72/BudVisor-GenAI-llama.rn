// BudgetAssistant/services/dbService.ts
import SQLite from 'react-native-sqlite-storage';
import { generateId } from './idGenerator';

SQLite.enablePromise(true);
const DB_NAME = 'rag.db';
const generateUuid = generateId;

let dbPromise: Promise<any> | null = null;

/**
 * Gets the database connection.
 * This function is now a singleton that also handles ALL table initialization.
 * This ensures table creation only runs ONCE and prevents race conditions.
 */
function getDB() {
  if (!dbPromise) {
    // This promise now represents the *entire initialization process*
    dbPromise = (async () => {
      try {
        const db = await SQLite.openDatabase({ name: DB_NAME, location: 'default' });
        console.log('Database opened...');

        // Run all table creations here, once.
        await db.executeSql(`CREATE TABLE IF NOT EXISTS documents (
          id TEXT PRIMARY KEY,
          text TEXT,
          embedding TEXT
        );`);

        await db.executeSql(`CREATE TABLE IF NOT EXISTS chat_memory (
          id TEXT PRIMARY KEY,
          role TEXT,
          text TEXT
        );`);

        await db.executeSql(`CREATE TABLE IF NOT EXISTS app_state (
          key TEXT PRIMARY KEY,
          value TEXT
        );`);
        
        console.log("Database initialized successfully (all tables created).");
        return db;
      } catch (e) {
        console.error("Failed to initialize database:", e);
        dbPromise = null; // Reset promise so we can try again
        throw e; // Re-throw error
      }
    })();
  }
  return dbPromise;
}

/**
 * Simple alias for getDB() to ensure DB is initialized.
 * All other functions will just call getDB() directly.
 */
export async function initDB() {
  return await getDB();
}

// ------------------- Document (RAG) Functions -------------------
export async function addDocument(text: string, embedding: number[]) {
  const db = await getDB(); // ⬅️ CHANGED
  const id = await generateUuid();
  await db.executeSql(
    'INSERT INTO documents (id, text, embedding) VALUES (?,?,?);',
    [id, text, JSON.stringify(embedding)]
  );
  return id;
}

export async function getAllDocs() {
  const db = await getDB(); // ⬅️ CHANGED
  const [res] = await db.executeSql(
    'SELECT id, text, embedding FROM documents ORDER BY rowid DESC;'
  );
  const rows: { id: string; text: string; embedding: number[] }[] = [];
  for (let i = 0; i < res.rows.length; i++) {
    const r = res.rows.item(i);
    rows.push({ id: r.id, text: r.text, embedding: JSON.parse(r.embedding) });
  }
  return rows;
}

export async function deleteDocument(id: string) {
    const db = await getDB(); // ⬅️ CHANGED
    await db.executeSql(
        'DELETE FROM documents WHERE id = ?;',
        [id]
    );
}

// ------------------- 🧠 Chat Memory Functions -------------------
export async function addChatMessage(role: 'user' | 'assistant', text: string) {
  const db = await getDB(); // ⬅️ CHANGED
  const id = await generateUuid();
  await db.executeSql(
    'INSERT INTO chat_memory (id, role, text) VALUES (?,?,?);',
    [id, role, text]
  );
}

export async function getChatHistory(limit = 10) {
  const db = await getDB(); // ⬅️ CHANGED
  const [res] = await db.executeSql(
    'SELECT role, text FROM chat_memory ORDER BY rowid ASC LIMIT ?;',
    [limit]
  );
  const rows: { role: 'user' | 'assistant'; text: string }[] = [];
  for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i));
  return rows;
}

export async function clearChatMemory() {
  const db = await getDB(); // ⬅️ CHANGED
  await db.executeSql('DELETE FROM chat_memory;');
}


// ------------------- 🚩 App State Flag Functions -------------------

/**
 * Gets the value of a flag from the app_state table.
 */
export async function getFlag(key: string): Promise<string | null> {
  const db = await getDB(); // ⬅️ CHANGED
  const [res] = await db.executeSql(
    'SELECT value FROM app_state WHERE key = ?;',
    [key]
  );
  if (res.rows.length > 0) {
    return res.rows.item(0).value;
  }
  return null;
}

/**
 * Sets or updates a flag in the app_state table.
 */
export async function setFlag(key: string, value: string) {
  const db = await getDB(); // ⬅️ CHANGED
  // "INSERT OR REPLACE" is a handy SQLite command (UPSERT)
  await db.executeSql(
    'INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?);',
    [key, value]
  );
}

// ------------------- 🚩 Clear All Rag documents -------------------
/**
 * Clears all RAG documents and all app state flags.
 * This will force a full re-ingestion on next app start.
 */
export async function resetRAGDatabase() {
  const db = await getDB();
  await db.executeSql('DELETE FROM documents;');
  await db.executeSql('DELETE FROM app_state;');
  console.log('RAG database and app flags have been reset.');
}