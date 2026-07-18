import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, 'lumina.db');
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
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      image TEXT NOT NULL,
      caption TEXT DEFAULT '',
      scheduledAt TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  try { db.run("ALTER TABLE posts ADD COLUMN scheduledAt TEXT"); } catch(e) {}

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
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      postId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      content TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
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
    CREATE TABLE IF NOT EXISTS stories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      image TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id)
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
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (fromUserId) REFERENCES users(id)
    )
  `);

  try { db.run("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'online'"); } catch(e) {}
  try { db.run("ALTER TABLE users ADD COLUMN lastSeen DATETIME DEFAULT CURRENT_TIMESTAMP"); } catch(e) {}
  try { db.run("ALTER TABLE users ADD COLUMN failedAttempts INTEGER DEFAULT 0"); } catch(e) {}
  try { db.run("ALTER TABLE users ADD COLUMN lockedUntil TEXT DEFAULT NULL"); } catch(e) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      targetId INTEGER NOT NULL,
      targetType TEXT NOT NULL,
      userId INTEGER NOT NULL,
      emoji TEXT NOT NULL DEFAULT '👍',
      createdAt TEXT DEFAULT (datetime('now')),
      UNIQUE(targetId, userId, targetType),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS story_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      storyId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      emoji TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      UNIQUE(storyId, userId),
      FOREIGN KEY (storyId) REFERENCES stories(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

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
  db.run('CREATE INDEX IF NOT EXISTS idx_follows_followerId ON follows(followerId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_follows_followingId ON follows(followingId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_stories_userId ON stories(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_stories_expiresAt ON stories(expiresAt)');
  db.run('CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_post_views_postId ON post_views(postId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_post_hashtags_tag ON post_hashtags(tag)');
  db.run('CREATE INDEX IF NOT EXISTS idx_blocks_blockerId ON blocks(blockerId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_blocks_blockedId ON blocks(blockedId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_two_factor_userId ON two_factor(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)');

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
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

export function run(sql, params = []) {
  db.run(sql, params);
  const lastId = db.exec('SELECT last_insert_rowid() as id');
  const changes = db.getRowsModified();
  saveDB();
  const id = lastId.length > 0 && lastId[0].values.length > 0 ? lastId[0].values[0][0] : null;
  return { changes, lastId: id };
}

export function getDb() {
  return db;
}
