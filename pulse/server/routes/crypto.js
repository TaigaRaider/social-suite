import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { run, query, queryOne, saveDB } from '../db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

router.post('/identity-key', auth, (req, res) => {
  try {
    const { identityKey, signedPreKey, oneTimePreKeys } = req.body;
    if (!identityKey || !signedPreKey || !oneTimePreKeys) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    run(`INSERT OR REPLACE INTO identity_keys (userId, identityKey, signedPreKeyPublic, signedPreKeySignature, signedPreKeyCreatedAt)
      VALUES (?, ?, ?, ?, ?)`,
      [req.userId, identityKey, signedPreKey.publicKey, signedPreKey.signature, signedPreKey.createdAt || new Date().toISOString()]
    );

    run('DELETE FROM one_time_pre_keys WHERE userId = ?', [req.userId]);
    for (const key of oneTimePreKeys) {
      run('INSERT INTO one_time_pre_keys (userId, keyId, publicKey) VALUES (?, ?, ?)',
        [req.userId, key.keyId, key.publicKey]
      );
    }

    saveDB();
    res.json({ success: true, uploaded: oneTimePreKeys.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload key bundle' });
  }
});

router.get('/identity-key/:userId', auth, (req, res) => {
  try {
    const peerId = parseInt(req.params.userId);
    const identityKey = queryOne('SELECT * FROM identity_keys WHERE userId = ?', [peerId]);
    if (!identityKey) {
      return res.status(404).json({ error: 'Key bundle not found' });
    }

    const preKeys = query('SELECT keyId, publicKey FROM one_time_pre_keys WHERE userId = ? AND claimed = 0 LIMIT 1', [peerId]);

    res.json({
      identityKey: identityKey.identityKey,
      signedPreKey: {
        publicKey: identityKey.signedPreKeyPublic,
        signature: identityKey.signedPreKeySignature,
        createdAt: identityKey.signedPreKeyCreatedAt
      },
      oneTimePreKeys: preKeys
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch key bundle' });
  }
});

router.post('/identity-key/rotate-signed-prekey', auth, (req, res) => {
  try {
    const { signedPreKey, createdAt } = req.body;
    if (!signedPreKey) return res.status(400).json({ error: 'Missing signedPreKey' });

    run(`UPDATE identity_keys SET signedPreKeyPublic = ?, signedPreKeySignature = ?, signedPreKeyCreatedAt = ? WHERE userId = ?`,
      [signedPreKey.publicKey, signedPreKey.signature, createdAt || new Date().toISOString(), req.userId]
    );

    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to rotate signed pre-key' });
  }
});

router.post('/identity-key/replenish-prekeys', auth, (req, res) => {
  try {
    const { oneTimePreKeys } = req.body;
    if (!oneTimePreKeys || !Array.isArray(oneTimePreKeys)) {
      return res.status(400).json({ error: 'Missing oneTimePreKeys' });
    }

    for (const key of oneTimePreKeys) {
      run('INSERT OR IGNORE INTO one_time_pre_keys (userId, keyId, publicKey) VALUES (?, ?, ?)',
        [req.userId, key.keyId, key.publicKey]
      );
    }

    const total = queryOne('SELECT COUNT(*) as count FROM one_time_pre_keys WHERE userId = ? AND claimed = 0', [req.userId]);
    saveDB();
    res.json({ success: true, count: total?.count || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to replenish pre-keys' });
  }
});

router.post('/session/prekey-bundle', auth, (req, res) => {
  try {
    const { recipientId, ephemeralPublic, identityPublic, ciphertext, nonce, mac, usedOneTimeKeyId } = req.body;
    if (!recipientId || !ephemeralPublic || !identityPublic || !ciphertext || !nonce || !mac) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = run(`INSERT INTO prekey_messages (recipientId, senderId, ephemeralPublic, identityPublic, usedOneTimeKeyId, ciphertext, nonce, mac)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [recipientId, req.userId, ephemeralPublic, identityPublic, usedOneTimeKeyId || null, ciphertext, nonce, mac]
    );

    if (usedOneTimeKeyId) {
      run('UPDATE one_time_pre_keys SET claimed = 1, claimedBy = ?, claimedAt = ? WHERE userId = ? AND keyId = ?',
        [req.userId, new Date().toISOString(), recipientId, usedOneTimeKeyId]
      );
    }

    saveDB();
    res.json({ success: true, messageId: result.lastId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to store pre-key bundle' });
  }
});

router.get('/session/prekey-bundles', auth, (req, res) => {
  try {
    const bundles = query('SELECT * FROM prekey_messages WHERE recipientId = ? AND delivered = 0', [req.userId]);
    res.json({ bundles });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pre-key bundles' });
  }
});

router.delete('/session/prekey-bundles/:bundleId', auth, (req, res) => {
  try {
    run('UPDATE prekey_messages SET delivered = 1 WHERE id = ? AND recipientId = ?',
      [parseInt(req.params.bundleId), req.userId]
    );
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to acknowledge bundle' });
  }
});

router.post('/message/relay', auth, (req, res) => {
  try {
    const { conversationId, ciphertext, nonce, ratchetHeader, replyToId } = req.body;
    if (!conversationId || !ciphertext || !nonce || !ratchetHeader) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const member = queryOne('SELECT * FROM conversation_members WHERE conversationId = ? AND userId = ?',
      [conversationId, req.userId]
    );
    if (!member) return res.status(403).json({ error: 'Not a member' });

    const result = run(
      `INSERT INTO messages (conversationId, senderId, content, encrypted, ciphertext, nonce, ratchetHeader, replyToId)
       VALUES (?, ?, '[encrypted]', 1, ?, ?, ?, ?)`,
      [conversationId, req.userId, ciphertext, nonce, JSON.stringify(ratchetHeader), replyToId || null]
    );

    saveDB();
    res.json({ success: true, messageId: result.lastId, createdAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to relay message' });
  }
});

// Get safety number between current user and a peer
router.get('/safety-number/:peerId', auth, (req, res) => {
  try {
    const peerId = parseInt(req.params.peerId);

    const myKeys = queryOne('SELECT identityKey FROM identity_keys WHERE userId = ?', [req.userId]);
    const peerKeys = queryOne('SELECT identityKey FROM identity_keys WHERE userId = ?', [peerId]);

    if (!myKeys || !peerKeys) {
      return res.status(404).json({ error: 'Both users must have E2EE enabled' });
    }

    // Sort IDs to ensure both users compute the same number
    const [first, second] = [req.userId, peerId].sort((a, b) => a - b);
    const firstKeys = first === req.userId ? myKeys : peerKeys;
    const secondKeys = first === req.userId ? peerKeys : myKeys;

    // Concatenate and hash
    const combined = firstKeys.identityKey + secondKeys.identityKey;
    const hash = createHash('sha256').update(combined).digest('hex');

    // Format as 12 groups of 5 digits
    const numericHash = BigInt('0x' + hash).toString().padStart(60, '0');
    const safetyNumber = [];
    for (let i = 0; i < 60; i += 5) {
      safetyNumber.push(numericHash.substring(i, i + 5));
    }

    const verified = queryOne(
      'SELECT * FROM verified_numbers WHERE userId = ? AND peerId = ?',
      [req.userId, peerId]
    );

    res.json({
      safetyNumber: safetyNumber.join(' '),
      safetyNumberArray: safetyNumber,
      qrData: `safety-number:${req.userId}:${peerId}:${hash}`,
      verified: !!verified,
      verifiedAt: verified?.verifiedAt || null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute safety number' });
  }
});

// Mark a safety number as verified
router.post('/safety-number/:peerId/verify', auth, (req, res) => {
  try {
    const peerId = parseInt(req.params.peerId);

    const myKeys = queryOne('SELECT identityKey FROM identity_keys WHERE userId = ?', [req.userId]);
    const peerKeys = queryOne('SELECT identityKey FROM identity_keys WHERE userId = ?', [peerId]);

    if (!myKeys || !peerKeys) {
      return res.status(404).json({ error: 'Both users must have E2EE enabled' });
    }

    const [first, second] = [req.userId, peerId].sort((a, b) => a - b);
    const firstKeys = first === req.userId ? myKeys : peerKeys;
    const secondKeys = first === req.userId ? peerKeys : myKeys;

    const combined = firstKeys.identityKey + secondKeys.identityKey;
    const hash = createHash('sha256').update(combined).digest('hex');

    run(`INSERT OR REPLACE INTO verified_numbers (userId, peerId, safetyNumberHash, verifiedAt)
      VALUES (?, ?, ?, datetime('now'))`,
      [req.userId, peerId, hash]
    );

    saveDB();
    res.json({ success: true, verified: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify safety number' });
  }
});

// Check if a safety number is verified
router.get('/safety-number/:peerId/status', auth, (req, res) => {
  try {
    const peerId = parseInt(req.params.peerId);
    const verified = queryOne(
      'SELECT * FROM verified_numbers WHERE userId = ? AND peerId = ?',
      [req.userId, peerId]
    );
    res.json({ verified: !!verified, verifiedAt: verified?.verifiedAt || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check verification status' });
  }
});

// Remove verification
router.delete('/safety-number/:peerId', auth, (req, res) => {
  try {
    const peerId = parseInt(req.params.peerId);
    run('DELETE FROM verified_numbers WHERE userId = ? AND peerId = ?', [req.userId, peerId]);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove verification' });
  }
});

// Get disappearing message settings for a conversation
router.get('/disappearing/:peerId', auth, (req, res) => {
  try {
    const peerId = parseInt(req.params.peerId);
    const settings = queryOne(
      'SELECT * FROM disappearing_message_settings WHERE userId = ? AND peerId = ?',
      [req.userId, peerId]
    );
    res.json(settings || { enabled: 0, durationSeconds: 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Update disappearing message settings
router.put('/disappearing/:peerId', auth, (req, res) => {
  try {
    const peerId = parseInt(req.params.peerId);
    const { enabled, durationSeconds } = req.body;

    run(`INSERT OR REPLACE INTO disappearing_message_settings (userId, peerId, enabled, durationSeconds, updatedAt)
      VALUES (?, ?, ?, ?, datetime('now'))`,
      [req.userId, peerId, enabled ? 1 : 0, durationSeconds || 0]
    );

    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Cleanup expired messages (called periodically)
router.post('/disappearing/cleanup', auth, (req, res) => {
  try {
    const deleted = run(
      "DELETE FROM messages WHERE expiresAt IS NOT NULL AND expiresAt <= datetime('now')"
    );
    saveDB();
    res.json({ success: true, deleted: deleted.changes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cleanup' });
  }
});

// Register a new device for the current user
router.post('/devices/register', auth, (req, res) => {
  try {
    const { deviceId, deviceName, identityKeyPublic, identityKeyPrivateEncrypted, signedPreKeyPublic, signedPreKeySignature, oneTimePreKeys } = req.body;

    if (!deviceId || !identityKeyPublic) {
      return res.status(400).json({ error: 'deviceId and identityKeyPublic required' });
    }

    // Unmark current device
    run('UPDATE device_keys SET isCurrent = 0 WHERE userId = ?', [req.userId]);

    run(`INSERT INTO device_keys (userId, deviceId, deviceName, identityKeyPublic, identityKeyPrivateEncrypted, signedPreKeyPublic, signedPreKeySignature, oneTimePreKeys, isCurrent, lastSeenAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
      [req.userId, deviceId, deviceName || 'Unknown device',
       Buffer.from(identityKeyPublic, 'base64'),
       Buffer.from(identityKeyPrivateEncrypted || '', 'base64'),
       signedPreKeyPublic ? Buffer.from(signedPreKeyPublic, 'base64') : null,
       signedPreKeySignature ? Buffer.from(signedPreKeySignature, 'base64') : null,
       JSON.stringify(oneTimePreKeys || [])]
    );

    saveDB();
    res.json({ success: true, deviceId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to register device' });
  }
});

// List all devices for current user
router.get('/devices', auth, (req, res) => {
  try {
    const devices = query(
      'SELECT id, deviceId, deviceName, isCurrent, lastSeenAt, createdAt FROM device_keys WHERE userId = ? ORDER BY lastSeenAt DESC',
      [req.userId]
    );
    res.json({ devices });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list devices' });
  }
});

// Remove a device
router.delete('/devices/:deviceId', auth, (req, res) => {
  try {
    const deviceId = req.params.deviceId;

    // Don't remove current device
    const current = queryOne('SELECT deviceId FROM device_keys WHERE userId = ? AND isCurrent = 1', [req.userId]);
    if (current && current.deviceId === deviceId) {
      return res.status(400).json({ error: 'Cannot remove current device' });
    }

    run('DELETE FROM device_keys WHERE userId = ? AND deviceId = ?', [req.userId, deviceId]);

    // Also delete sessions and pre-keys for this device
    run('DELETE FROM ratchet_sessions WHERE (userId = ? OR peerId = ?) AND deviceId = ?', [req.userId, req.userId, deviceId]);
    run('DELETE FROM one_time_pre_keys WHERE userId = ? AND deviceId = ?', [req.userId, deviceId]);

    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove device' });
  }
});

// Set a device as current
router.put('/devices/:deviceId/activate', auth, (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    run('UPDATE device_keys SET isCurrent = 0 WHERE userId = ?', [req.userId]);
    run('UPDATE device_keys SET isCurrent = 1, lastSeenAt = datetime(\'now\') WHERE userId = ? AND deviceId = ?', [req.userId, deviceId]);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to activate device' });
  }
});

// Update device last seen
router.post('/devices/:deviceId/heartbeat', auth, (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    run('UPDATE device_keys SET lastSeenAt = datetime(\'now\') WHERE userId = ? AND deviceId = ?', [req.userId, deviceId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update heartbeat' });
  }
});

// Get all devices for a user (for key distribution)
router.get('/devices/user/:userId', auth, (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const devices = query(
      'SELECT deviceId, deviceName, identityKeyPublic, signedPreKeyPublic, signedPreKeySignature, oneTimePreKeys, lastSeenAt FROM device_keys WHERE userId = ? ORDER BY lastSeenAt DESC',
      [userId]
    );
    res.json({ devices });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user devices' });
  }
});

// Get typing status for a peer
router.get('/typing/:peerId', auth, (req, res) => {
  try {
    const peerId = parseInt(req.params.peerId);
    const typing = queryOne(
      'SELECT isTyping, lastUpdated FROM typing_indicators WHERE userId = ? AND peerId = ?',
      [peerId, req.userId]
    );
    res.json({ isTyping: typing ? typing.isTyping === 1 : false });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get typing status' });
  }
});

// Get online status for users
router.post('/online-status', auth, (req, res) => {
  try {
    const { userIds } = req.body;
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ error: 'userIds array required' });
    }
    const placeholders = userIds.map(() => '?').join(',');
    const statuses = query(
      `SELECT userId, isOnline, lastSeenAt FROM online_status WHERE userId IN (${placeholders})`,
      userIds
    );
    const statusMap = {};
    statuses.forEach(s => { statusMap[s.userId] = { isOnline: s.isOnline === 1, lastSeenAt: s.lastSeenAt }; });
    res.json({ statuses: statusMap });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get online status' });
  }
});

// Get reactions for messages
router.post('/reactions', auth, (req, res) => {
  try {
    const { messageIds } = req.body;
    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({ error: 'messageIds array required' });
    }
    const placeholders = messageIds.map(() => '?').join(',');
    const reactions = query(
      `SELECT r.messageId, r.userId, r.emoji, r.createdAt, u.username 
       FROM message_reactions r JOIN users u ON r.userId = u.id 
       WHERE r.messageId IN (${placeholders})`,
      messageIds
    );
    const reactionsMap = {};
    reactions.forEach(r => {
      if (!reactionsMap[r.messageId]) reactionsMap[r.messageId] = [];
      reactionsMap[r.messageId].push({ userId: r.userId, username: r.username, emoji: r.emoji, createdAt: r.createdAt });
    });
    res.json({ reactions: reactionsMap });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get reactions' });
  }
});

// Register push token
router.post('/push/register', auth, (req, res) => {
  try {
    const { token, platform, deviceId } = req.body;
    if (!token) return res.status(400).json({ error: 'token required' });

    run(`INSERT OR REPLACE INTO push_tokens (userId, token, platform, deviceId, createdAt)
      VALUES (?, ?, ?, ?, datetime('now'))`,
      [req.userId, token, platform || 'unknown', deviceId || null]);

    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to register token' });
  }
});

// Unregister push token
router.post('/push/unregister', auth, (req, res) => {
  try {
    const { token } = req.body;
    run('DELETE FROM push_tokens WHERE userId = ? AND token = ?', [req.userId, token]);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unregister token' });
  }
});

// Get user notifications
router.get('/notifications', auth, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const notifications = query(
      'SELECT * FROM notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?',
      [req.userId, limit, offset]
    );
    const unread = queryOne(
      'SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND read = 0',
      [req.userId]
    );
    res.json({ notifications, unreadCount: unread?.count || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Mark notifications as read
router.put('/notifications/read', auth, (req, res) => {
  try {
    const { ids } = req.body;
    if (ids && Array.isArray(ids)) {
      const placeholders = ids.map(() => '?').join(',');
      run(`UPDATE notifications SET read = 1 WHERE userId = ? AND id IN (${placeholders})`, [req.userId, ...ids]);
    } else {
      run('UPDATE notifications SET read = 1 WHERE userId = ?', [req.userId]);
    }
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Send read receipt
router.post('/messages/:messageId/read', auth, (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    run("UPDATE messages SET readAt = datetime('now') WHERE id = ? AND receiverId = ?", [messageId, req.userId]);

    const message = queryOne('SELECT senderId FROM messages WHERE id = ?', [messageId]);
    if (message) {
      run(`INSERT INTO notifications (userId, type, title, body, data, createdAt)
        VALUES (?, 'message_read', 'Message Read', 'Your message was read', ?, datetime('now'))`,
        [message.senderId, JSON.stringify({ messageId })]);
    }

    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Mark message as delivered
router.post('/messages/:messageId/delivered', auth, (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    run("UPDATE messages SET deliveredAt = datetime('now') WHERE id = ? AND deliveredAt IS NULL", [messageId]);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark delivered' });
  }
});

// Get message read status
router.get('/messages/:messageId/status', auth, (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const message = queryOne(
      'SELECT id, deliveredAt, readAt FROM messages WHERE id = ?',
      [messageId]
    );
    res.json({
      delivered: !!message?.deliveredAt,
      read: !!message?.readAt,
      deliveredAt: message?.deliveredAt,
      readAt: message?.readAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Initiate a call
router.post('/calls/initiate', auth, (req, res) => {
  try {
    const { receiverId, groupId, callType } = req.body;

    const session = run(`INSERT INTO call_sessions (callerId, receiverId, groupId, callType, status, startedAt)
      VALUES (?, ?, ?, ?, 'ringing', datetime('now'))`,
      [req.userId, receiverId || null, groupId || null, callType || 'voice']);

    saveDB();
    res.json({ success: true, sessionId: session.lastId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

// Answer a call
router.post('/calls/:sessionId/answer', auth, (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    run("UPDATE call_sessions SET status = 'active', answeredAt = datetime('now') WHERE id = ?", [sessionId]);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to answer call' });
  }
});

// End a call
router.post('/calls/:sessionId/end', auth, (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const { reason } = req.body;

    const session = queryOne('SELECT * FROM call_sessions WHERE id = ?', [sessionId]);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const duration = session.answeredAt
      ? Math.floor((Date.now() - new Date(session.answeredAt).getTime()) / 1000)
      : 0;

    run("UPDATE call_sessions SET status = 'ended', endedAt = datetime('now'), duration = ? WHERE id = ?",
      [duration, sessionId]);

    saveDB();
    res.json({ success: true, duration });
  } catch (err) {
    res.status(500).json({ error: 'Failed to end call' });
  }
});

// Reject a call
router.post('/calls/:sessionId/reject', auth, (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    run("UPDATE call_sessions SET status = 'rejected', endedAt = datetime('now') WHERE id = ?", [sessionId]);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject call' });
  }
});

// Get call history
router.get('/calls/history', auth, (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const calls = query(
      `SELECT c.*, u.username as callerName FROM call_sessions c
       JOIN users u ON c.callerId = u.id
       WHERE c.callerId = ? OR c.receiverId = ?
       ORDER BY c.startedAt DESC LIMIT ?`,
      [req.userId, req.userId, limit]
    );
    res.json({ calls });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get call history' });
  }
});

// Get all sticker packs
router.get('/stickers', auth, (req, res) => {
  try {
    const packs = query('SELECT * FROM sticker_packs ORDER BY isBuiltin DESC, name ASC');
    const parsed = packs.map(p => ({ ...p, stickers: JSON.parse(p.stickers || '[]') }));
    res.json({ packs: parsed });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get stickers' });
  }
});

// Get user's installed sticker packs
router.get('/stickers/mine', auth, (req, res) => {
  try {
    const packs = query(
      `SELECT sp.* FROM sticker_packs sp 
       JOIN user_sticker_packs us ON sp.id = us.packId 
       WHERE us.userId = ? ORDER BY us.addedAt DESC`,
      [req.userId]
    );
    const parsed = packs.map(p => ({ ...p, stickers: JSON.parse(p.stickers || '[]') }));
    res.json({ packs: parsed });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user stickers' });
  }
});

// Install a sticker pack
router.post('/stickers/install/:packId', auth, (req, res) => {
  try {
    const packId = parseInt(req.params.packId);
    run('INSERT OR IGNORE INTO user_sticker_packs (userId, packId, addedAt) VALUES (?, ?, datetime(\'now\'))', [req.userId, packId]);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to install pack' });
  }
});

// Uninstall a sticker pack
router.delete('/stickers/install/:packId', auth, (req, res) => {
  try {
    const packId = parseInt(req.params.packId);
    run('DELETE FROM user_sticker_packs WHERE userId = ? AND packId = ?', [req.userId, packId]);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to uninstall pack' });
  }
});

export default router;
