import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'whisper.db');

let db;

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
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      content TEXT NOT NULL,
      replyToId INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (replyToId) REFERENCES posts(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      postId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      UNIQUE(postId, userId),
      FOREIGN KEY (postId) REFERENCES posts(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reposts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      postId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(postId, userId),
      FOREIGN KEY (postId) REFERENCES posts(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      postId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      UNIQUE(postId, userId),
      FOREIGN KEY (postId) REFERENCES posts(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS follows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      followerId INTEGER NOT NULL,
      followingId INTEGER NOT NULL,
      UNIQUE(followerId, followingId),
      FOREIGN KEY (followerId) REFERENCES users(id),
      FOREIGN KEY (followingId) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      fromUserId INTEGER NOT NULL,
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
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
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
  return results[0] || null;
}

export function run(sql, params = []) {
  db.run(sql, params);
  saveDB();
  return { changes: db.getRowsModified(), lastId: db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0] };
}
