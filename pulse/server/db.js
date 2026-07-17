import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const DB_PATH = './pulse.db';
let db;

export async function initDB() {
  const SQL = await initSqlJs();
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    firstName TEXT DEFAULT '',
    lastName TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    status TEXT DEFAULT 'offline',
    lastSeen DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS conversation_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversationId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    UNIQUE(conversationId, userId),
    FOREIGN KEY(conversationId) REFERENCES conversations(id),
    FOREIGN KEY(userId) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversationId INTEGER NOT NULL,
    senderId INTEGER NOT NULL,
    content TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(conversationId) REFERENCES conversations(id),
    FOREIGN KEY(senderId) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId1 INTEGER NOT NULL,
    userId2 INTEGER NOT NULL,
    status TEXT DEFAULT 'accepted',
    UNIQUE(userId1, userId2),
    FOREIGN KEY(userId1) REFERENCES users(id),
    FOREIGN KEY(userId2) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    fromUserId INTEGER NOT NULL,
    type TEXT NOT NULL,
    referenceId INTEGER,
    read INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id),
    FOREIGN KEY(fromUserId) REFERENCES users(id)
  )`);

  saveDB();
  console.log('Database initialized');
}

export function saveDB() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(DB_PATH, buffer);
  }
}

export function query(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function queryOne(sql, params = []) {
  const results = query(sql, params);
  return results.length > 0 ? results[0] : null;
}

export function run(sql, params = []) {
  db.run(sql, params);
  saveDB();
  return { changes: db.getRowsModified(), lastId: queryOne('SELECT last_insert_rowid() as id').id };
}
