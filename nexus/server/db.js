import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { runMigrations } from './migrations.js';
import { startBackup } from './backup.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'nexus.db');

let db;

export async function initDB() {
  const SQL = await initSqlJs();
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    firstName TEXT NOT NULL DEFAULT '',
    lastName TEXT NOT NULL DEFAULT '',
    bio TEXT DEFAULT '',
    avatar TEXT DEFAULT '',
    coverPhoto TEXT DEFAULT '',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  try { db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'"); } catch(e) {}

  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    image TEXT DEFAULT '',
    scheduledAt TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  try { db.run("ALTER TABLE posts ADD COLUMN scheduledAt TEXT"); } catch(e) {}

  db.run(`CREATE TABLE IF NOT EXISTS polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    postId INTEGER NOT NULL,
    question TEXT NOT NULL,
    expiresAt TEXT,
    FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS poll_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pollId INTEGER NOT NULL,
    text TEXT NOT NULL,
    FOREIGN KEY (pollId) REFERENCES polls(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS poll_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    optionId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    UNIQUE(optionId, userId),
    FOREIGN KEY (optionId) REFERENCES poll_options(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    postId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(postId, userId),
    FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    postId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    content TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS friendships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    requesterId INTEGER NOT NULL,
    addresseeId INTEGER NOT NULL,
    status TEXT CHECK(status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(requesterId, addresseeId),
    FOREIGN KEY (requesterId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (addresseeId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    senderId INTEGER NOT NULL,
    receiverId INTEGER NOT NULL,
    content TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiverId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    fromUserId INTEGER,
    type TEXT NOT NULL,
    referenceId INTEGER,
    read INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (fromUserId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  try { db.run("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'online'"); } catch(e) {}
  try { db.run("ALTER TABLE users ADD COLUMN lastSeen DATETIME DEFAULT CURRENT_TIMESTAMP"); } catch(e) {}
  try { db.run("ALTER TABLE users ADD COLUMN failedAttempts INTEGER DEFAULT 0"); } catch(e) {}
  try { db.run("ALTER TABLE users ADD COLUMN lockedUntil TEXT DEFAULT NULL"); } catch(e) {}

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

  db.run(`CREATE TABLE IF NOT EXISTS post_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    postId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    viewedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS hashtags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag TEXT UNIQUE NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS post_hashtags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    postId INTEGER NOT NULL,
    tag TEXT NOT NULL,
    UNIQUE(postId, tag),
    FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blockerId INTEGER NOT NULL,
    blockedId INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(blockerId, blockedId),
    FOREIGN KEY (blockerId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (blockedId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS mutes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    muterId INTEGER NOT NULL,
    mutedId INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(muterId, mutedId),
    FOREIGN KEY (muterId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (mutedId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporterId INTEGER NOT NULL,
    targetType TEXT NOT NULL,
    targetId INTEGER NOT NULL,
    reason TEXT NOT NULL,
    details TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    reviewedBy INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporterId) REFERENCES users(id) ON DELETE CASCADE
  )`);

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

  db.run('CREATE INDEX IF NOT EXISTS idx_posts_userId ON posts(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_posts_createdAt ON posts(createdAt)');
  db.run('CREATE INDEX IF NOT EXISTS idx_likes_postId ON likes(postId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_likes_userId ON likes(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_comments_postId ON comments(postId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_comments_userId ON comments(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_senderId ON messages(senderId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_receiverId ON messages(receiverId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(userId, read)');
  db.run('CREATE INDEX IF NOT EXISTS idx_friendships_requesterId ON friendships(requesterId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_friendships_addresseeId ON friendships(addresseeId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_post_views_postId ON post_views(postId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_post_views_userId ON post_views(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_post_hashtags_tag ON post_hashtags(tag)');
  db.run('CREATE INDEX IF NOT EXISTS idx_blocks_blockerId ON blocks(blockerId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_blocks_blockedId ON blocks(blockedId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_two_factor_userId ON two_factor(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)');

  runMigrations(db);

  startBackup(DB_PATH, 'nexus');

  process.on('SIGINT', () => { flushDB(); process.exit(0); });
  process.on('SIGTERM', () => { flushDB(); process.exit(0); });

  return db;
}

let saveTimeout = null;
let dirty = false;

export function saveDB() {
  dirty = true;
  if (saveTimeout) return;
  saveTimeout = setTimeout(() => {
    if (dirty && db) {
      const data = db.export();
      const buffer = Buffer.from(data);
      writeFileSync(DB_PATH, buffer);
      dirty = false;
    }
    saveTimeout = null;
  }, 100);
}

export function flushDB() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  if (dirty && db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(DB_PATH, buffer);
    dirty = false;
  }
}

export function query(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

export function queryOne(sql, params = []) {
  const rows = query(sql, params);
  return rows.length > 0 ? rows[0] : undefined;
}

export function run(sql, params = []) {
  db.run(sql, params);
  const lastId = queryOne('SELECT last_insert_rowid() as id');
  saveDB();
  return { lastInsertRowid: lastId ? lastId.id : null, changes: db.getRowsModified() };
}

export function getDb() {
  return db;
}
