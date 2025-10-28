// BudgetAssistant/services/dbService.ts
import SQLite from 'react-native-sqlite-storage';
import { generateId } from './idGenerator';

SQLite.enablePromise(true);
const DB_NAME = 'rag.db';
const generateUuid = generateId;

let dbPromise: Promise<any> | null = null;
function getDB() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabase({ name: DB_NAME, location: 'default' });
  }
  return dbPromise;
}

export async function initDB() {
  const db = await getDB();

  // Existing documents table (for RAG)
  await db.executeSql(`CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    text TEXT,
    embedding TEXT
  );`);

  // 🧠 New chat memory table
  await db.executeSql(`CREATE TABLE IF NOT EXISTS chat_memory (
    id TEXT PRIMARY KEY,
    role TEXT,
    text TEXT
  );`);

  return db;
}

// ------------------- Document (RAG) Functions -------------------
export async function addDocument(text: string, embedding: number[]) {
  const db = await initDB();
  const id = await generateUuid();
  await db.executeSql(
    'INSERT INTO documents (id, text, embedding) VALUES (?,?,?);',
    [id, text, JSON.stringify(embedding)]
  );
  return id;
}

export async function getAllDocs() {
  const db = await initDB();
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
    const db = await initDB();
    await db.executeSql(
        'DELETE FROM documents WHERE id = ?;',
        [id]
    );
}

// ------------------- 🧠 Chat Memory Functions -------------------
export async function addChatMessage(role: 'user' | 'assistant', text: string) {
  const db = await initDB();
  const id = await generateUuid();
  await db.executeSql(
    'INSERT INTO chat_memory (id, role, text) VALUES (?,?,?);',
    [id, role, text]
  );
}

export async function getChatHistory(limit = 10) {
  const db = await initDB();
  const [res] = await db.executeSql(
    'SELECT role, text FROM chat_memory ORDER BY rowid ASC LIMIT ?;',
    [limit]
  );
  const rows: { role: 'user' | 'assistant'; text: string }[] = [];
  for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i));
  return rows;
}

export async function clearChatMemory() {
  const db = await initDB();
  await db.executeSql('DELETE FROM chat_memory;');
}
