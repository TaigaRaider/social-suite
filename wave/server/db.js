import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'wave.db');
let db = null;

export async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      firstName TEXT DEFAULT '',
      lastName TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      status TEXT DEFAULT 'offline',
      lastSeen DATETIME,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      avatar TEXT DEFAULT '',
      createdBy INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (createdBy) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      groupId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      role TEXT DEFAULT 'member',
      joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (groupId) REFERENCES groups(id),
      FOREIGN KEY (userId) REFERENCES users(id),
      UNIQUE(groupId, userId)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      groupId INTEGER NOT NULL,
      senderId INTEGER NOT NULL,
      content TEXT NOT NULL,
      replyToId INTEGER,
      read INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (groupId) REFERENCES groups(id),
      FOREIGN KEY (senderId) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS friends (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId1 INTEGER NOT NULL,
      userId2 INTEGER NOT NULL,
      status TEXT DEFAULT 'accepted',
      FOREIGN KEY (userId1) REFERENCES users(id),
      FOREIGN KEY (userId2) REFERENCES users(id),
      UNIQUE(userId1, userId2)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      fromUserId INTEGER,
      type TEXT NOT NULL,
      referenceId INTEGER,
      read INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (fromUserId) REFERENCES users(id)
    )
  `);

  saveDB();
  return db;
}

export function saveDB() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

export function query(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (err) {
    console.error('Query error:', err);
    throw err;
  }
}

export function queryOne(sql, params = []) {
  const results = query(sql, params);
  return results.length > 0 ? results[0] : null;
}

export function run(sql, params = []) {
  try {
    db.run(sql, params);
    saveDB();
    return { lastId: db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0], changes: db.getRowsModified() };
  } catch (err) {
    console.error('Run error:', err);
    throw err;
  }
}
