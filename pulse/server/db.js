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

  try { db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'"); } catch(e) {}

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

  db.run(`CREATE TABLE IF NOT EXISTS push_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    token TEXT NOT NULL,
    platform TEXT DEFAULT 'unknown',
    deviceId TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId, token),
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
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
  try { db.run("ALTER TABLE messages ADD COLUMN deliveredAt DATETIME DEFAULT NULL"); } catch(e) {}
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

  db.run(`CREATE TABLE IF NOT EXISTS identity_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL UNIQUE,
    identityKey TEXT NOT NULL,
    signedPreKeyPublic TEXT NOT NULL,
    signedPreKeySignature TEXT NOT NULL,
    signedPreKeyCreatedAt DATETIME NOT NULL,
    registeredAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS device_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    deviceId TEXT NOT NULL,
    deviceName TEXT DEFAULT 'Unknown device',
    identityKeyPublic BLOB NOT NULL,
    identityKeyPrivateEncrypted BLOB NOT NULL,
    signedPreKeyPublic BLOB,
    signedPreKeySignature BLOB,
    oneTimePreKeys TEXT DEFAULT '[]',
    isCurrent INTEGER DEFAULT 0,
    lastSeenAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run('CREATE INDEX IF NOT EXISTS idx_device_keys_user ON device_keys(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_device_keys_device ON device_keys(userId, deviceId)');
  db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_device_keys_unique ON device_keys(userId, deviceId)');

  db.run(`CREATE TABLE IF NOT EXISTS one_time_pre_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    keyId INTEGER NOT NULL,
    publicKey TEXT NOT NULL,
    claimed INTEGER DEFAULT 0,
    claimedBy INTEGER DEFAULT NULL,
    claimedAt DATETIME DEFAULT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId, keyId),
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS ratchet_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    peerId INTEGER NOT NULL,
    sessionType TEXT NOT NULL DEFAULT '1:1',
    sessionId TEXT NOT NULL,
    state TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    lastActiveAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId, peerId, sessionType),
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS prekey_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipientId INTEGER NOT NULL,
    senderId INTEGER NOT NULL,
    ephemeralPublic TEXT NOT NULL,
    identityPublic TEXT NOT NULL,
    usedOneTimeKeyId INTEGER DEFAULT NULL,
    ciphertext TEXT NOT NULL,
    nonce TEXT NOT NULL,
    mac TEXT NOT NULL,
    delivered INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(recipientId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  try { db.run("ALTER TABLE messages ADD COLUMN encrypted INTEGER DEFAULT 0"); } catch(e) {}
  try { db.run("ALTER TABLE messages ADD COLUMN ciphertext TEXT DEFAULT NULL"); } catch(e) {}
  try { db.run("ALTER TABLE messages ADD COLUMN nonce TEXT DEFAULT NULL"); } catch(e) {}
  try { db.run("ALTER TABLE messages ADD COLUMN ratchetHeader TEXT DEFAULT NULL"); } catch(e) {}

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
  db.run('CREATE INDEX IF NOT EXISTS idx_identity_keys_userId ON identity_keys(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_one_time_pre_keys_userId ON one_time_pre_keys(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_one_time_pre_keys_claimed ON one_time_pre_keys(claimed)');
  db.run('CREATE INDEX IF NOT EXISTS idx_ratchet_sessions_user_peer ON ratchet_sessions(userId, peerId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_prekey_messages_recipient ON prekey_messages(recipientId)');

  db.run(`CREATE TABLE IF NOT EXISTS verified_numbers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    peerId INTEGER NOT NULL,
    safetyNumberHash TEXT NOT NULL,
    verifiedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId, peerId),
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(peerId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run('CREATE INDEX IF NOT EXISTS idx_verified_numbers_user ON verified_numbers(userId, peerId)');

  try { db.run("ALTER TABLE messages ADD COLUMN expiresAt DATETIME DEFAULT NULL"); } catch(e) {}
  try { db.run("ALTER TABLE messages ADD COLUMN deviceId TEXT DEFAULT NULL"); } catch(e) {}
  try { db.run("ALTER TABLE messages ADD COLUMN targetDeviceId TEXT DEFAULT NULL"); } catch(e) {}
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_device ON messages(deviceId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_target_device ON messages(targetDeviceId)');

  db.run(`CREATE TABLE IF NOT EXISTS disappearing_message_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    peerId INTEGER NOT NULL,
    enabled INTEGER DEFAULT 0,
    durationSeconds INTEGER DEFAULT 0,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId, peerId),
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS typing_indicators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    peerId INTEGER NOT NULL,
    isTyping INTEGER DEFAULT 0,
    lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId, peerId),
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS online_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL UNIQUE,
    isOnline INTEGER DEFAULT 0,
    lastSeenAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS message_reactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    messageId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    emoji TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(messageId, userId, emoji),
    FOREIGN KEY(messageId) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run('CREATE INDEX IF NOT EXISTS idx_typing_user ON typing_indicators(userId, peerId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_online_user ON online_status(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(messageId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_reactions_user ON message_reactions(userId)');

  db.run('CREATE INDEX IF NOT EXISTS idx_messages_expiresAt ON messages(expiresAt)');
  db.run('CREATE INDEX IF NOT EXISTS idx_disappearing_settings_user ON disappearing_message_settings(userId, peerId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(userId)');
  db.run('CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_readAt ON messages(readAt)');

  saveDB();
  console.log('Database initialized');

  process.on('SIGINT', () => { flushDB(); process.exit(0); });
  process.on('SIGTERM', () => { flushDB(); process.exit(0); });
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
