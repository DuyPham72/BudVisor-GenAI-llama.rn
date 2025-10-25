// services/dbService.ts
import SQLite from 'react-native-sqlite-storage';

async function generateUuid(): Promise<string> {
  const { v4 } = await import('uuid');
  return v4();
}

SQLite.enablePromise(true);
const DB_NAME = 'rag.db';

let dbPromise: Promise<any> | null = null;
function getDB() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabase({ name: DB_NAME, location: 'default' });
  }
  return dbPromise;
}

export async function initDB() {
  const db = await getDB();
  await db.executeSql(`CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    text TEXT,
    embedding TEXT
  );`);
  return db;
}

export async function addDocument(text: string, embedding: number[]) {
  const db = await initDB();
  const id = await generateUuid();
  await db.executeSql('INSERT INTO documents (id, text, embedding) VALUES (?,?,?);', [id, text, JSON.stringify(embedding)]);
  return id;
}

export async function getAllDocs() {
  const db = await initDB();
  const [res] = await db.executeSql('SELECT id, text, embedding FROM documents ORDER BY rowid DESC;');
  const rows: { id: string; text: string; embedding: number[] }[] = [];
  for (let i = 0; i < res.rows.length; i++) {
    const r = res.rows.item(i);
    rows.push({ id: r.id, text: r.text, embedding: JSON.parse(r.embedding) });
  }
  return rows;
}
