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

  db.run(`CREATE TABLE IF NOT EXISTS typing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    targetId INTEGER NOT NULL,
    expiresAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    targetId INTEGER NOT NULL,
    targetType TEXT NOT NULL,
    userId INTEGER NOT NULL,
    emoji TEXT NOT NULL DEFAULT '👍',
    createdAt TEXT DEFAULT (datetime('now')),
    UNIQUE(targetId, userId, targetType),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  try { db.run("ALTER TABLE users ADD COLUMN failedAttempts INTEGER DEFAULT 0"); } catch(e) {}
  try { db.run("ALTER TABLE users ADD COLUMN lockedUntil TEXT DEFAULT NULL"); } catch(e) {}

  db.run(`CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    action TEXT NOT NULL,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    statusCode INTEGER,
    ip TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  try { db.run("ALTER TABLE messages ADD COLUMN readAt DATETIME DEFAULT NULL"); } catch(e) {}
  try { db.run("ALTER TABLE messages ADD COLUMN edited INTEGER DEFAULT 0"); } catch(e) {}

  db.run(`CREATE TABLE IF NOT EXISTS two_factor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL UNIQUE,
    secret TEXT NOT NULL,
    backupCodes TEXT NOT NULL DEFAULT '[]',
    enabled INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expiresAt DATETIME NOT NULL,
    used INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run('CREATE INDEX IF NOT EXISTS idx_messages_conversationId ON messages(conversationId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_senderId ON messages(senderId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_createdAt ON messages(createdAt)');
  db.run('CREATE INDEX IF NOT EXISTS idx_friends_userId1 ON friends(userId1)');
  db.run('CREATE INDEX IF NOT EXISTS idx_friends_userId2 ON friends(userId2)');
  db.run('CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(userId, read)');
  db.run('CREATE INDEX IF NOT EXISTS idx_typing_userId ON typing(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_typing_targetId ON typing(targetId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions(targetId, targetType)');
  db.run('CREATE INDEX IF NOT EXISTS idx_reactions_userId ON reactions(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_conversation_members_userId ON conversation_members(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_conversation_members_conv ON conversation_members(conversationId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_audit_log_userId ON audit_log(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_audit_log_createdAt ON audit_log(createdAt)');
  db.run('CREATE INDEX IF NOT EXISTS idx_two_factor_userId ON two_factor(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)');

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

export function getDb() {
  return db;
}
