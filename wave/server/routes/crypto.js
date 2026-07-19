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
    req.user = decoded;
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
      [req.user.id, identityKey, signedPreKey.publicKey, signedPreKey.signature, signedPreKey.createdAt || new Date().toISOString()]
    );

    run('DELETE FROM one_time_pre_keys WHERE userId = ?', [req.user.id]);
    for (const key of oneTimePreKeys) {
      run('INSERT INTO one_time_pre_keys (userId, keyId, publicKey) VALUES (?, ?, ?)',
        [req.user.id, key.keyId, key.publicKey]
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
      [signedPreKey.publicKey, signedPreKey.signature, createdAt || new Date().toISOString(), req.user.id]
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
        [req.user.id, key.keyId, key.publicKey]
      );
    }

    const total = queryOne('SELECT COUNT(*) as count FROM one_time_pre_keys WHERE userId = ? AND claimed = 0', [req.user.id]);
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
      [recipientId, req.user.id, ephemeralPublic, identityPublic, usedOneTimeKeyId || null, ciphertext, nonce, mac]
    );

    if (usedOneTimeKeyId) {
      run('UPDATE one_time_pre_keys SET claimed = 1, claimedBy = ?, claimedAt = ? WHERE userId = ? AND keyId = ?',
        [req.user.id, new Date().toISOString(), recipientId, usedOneTimeKeyId]
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
    const bundles = query('SELECT * FROM prekey_messages WHERE recipientId = ? AND delivered = 0', [req.user.id]);
    res.json({ bundles });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pre-key bundles' });
  }
});

router.delete('/session/prekey-bundles/:bundleId', auth, (req, res) => {
  try {
    run('UPDATE prekey_messages SET delivered = 1 WHERE id = ? AND recipientId = ?',
      [parseInt(req.params.bundleId), req.user.id]
    );
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to acknowledge bundle' });
  }
});

router.post('/message/relay', auth, (req, res) => {
  try {
    const { groupId, ciphertext, nonce, ratchetHeader, replyToId } = req.body;
    if (!groupId || !ciphertext || !nonce || !ratchetHeader) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const member = queryOne('SELECT * FROM group_members WHERE groupId = ? AND userId = ?',
      [groupId, req.user.id]
    );
    if (!member) return res.status(403).json({ error: 'Not a member' });

    const result = run(
      `INSERT INTO messages (groupId, senderId, content, encrypted, ciphertext, nonce, ratchetHeader, replyToId)
       VALUES (?, ?, '[encrypted]', 1, ?, ?, ?, ?)`,
      [groupId, req.user.id, ciphertext, nonce, JSON.stringify(ratchetHeader), replyToId || null]
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

    const myKeys = queryOne('SELECT identityKey FROM identity_keys WHERE userId = ?', [req.user.id]);
    const peerKeys = queryOne('SELECT identityKey FROM identity_keys WHERE userId = ?', [peerId]);

    if (!myKeys || !peerKeys) {
      return res.status(404).json({ error: 'Both users must have E2EE enabled' });
    }

    const [first, second] = [req.user.id, peerId].sort((a, b) => a - b);
    const firstKeys = first === req.user.id ? myKeys : peerKeys;
    const secondKeys = first === req.user.id ? peerKeys : myKeys;

    const combined = firstKeys.identityKey + secondKeys.identityKey;
    const hash = createHash('sha256').update(combined).digest('hex');

    const numericHash = BigInt('0x' + hash).toString().padStart(60, '0');
    const safetyNumber = [];
    for (let i = 0; i < 60; i += 5) {
      safetyNumber.push(numericHash.substring(i, i + 5));
    }

    const verified = queryOne(
      'SELECT * FROM verified_numbers WHERE userId = ? AND peerId = ?',
      [req.user.id, peerId]
    );

    res.json({
      safetyNumber: safetyNumber.join(' '),
      safetyNumberArray: safetyNumber,
      qrData: `safety-number:${req.user.id}:${peerId}:${hash}`,
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

    const myKeys = queryOne('SELECT identityKey FROM identity_keys WHERE userId = ?', [req.user.id]);
    const peerKeys = queryOne('SELECT identityKey FROM identity_keys WHERE userId = ?', [peerId]);

    if (!myKeys || !peerKeys) {
      return res.status(404).json({ error: 'Both users must have E2EE enabled' });
    }

    const [first, second] = [req.user.id, peerId].sort((a, b) => a - b);
    const firstKeys = first === req.user.id ? myKeys : peerKeys;
    const secondKeys = first === req.user.id ? peerKeys : myKeys;

    const combined = firstKeys.identityKey + secondKeys.identityKey;
    const hash = createHash('sha256').update(combined).digest('hex');

    run(`INSERT OR REPLACE INTO verified_numbers (userId, peerId, safetyNumberHash, verifiedAt)
      VALUES (?, ?, ?, datetime('now'))`,
      [req.user.id, peerId, hash]
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
      [req.user.id, peerId]
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
    run('DELETE FROM verified_numbers WHERE userId = ? AND peerId = ?', [req.user.id, peerId]);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove verification' });
  }
});

// Initialize group encryption (called by group creator)
router.post('/group/:groupId/init', auth, (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);

    // Verify creator is admin
    const member = queryOne('SELECT * FROM group_members WHERE groupId = ? AND userId = ? AND role = ?',
      [groupId, req.user.id, 'admin']
    );
    if (!member) return res.status(403).json({ error: 'Only group admin can initialize encryption' });

    // Generate chain key (32 random bytes as hex)
    const chainKey = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    // Store for creator
    run('INSERT OR REPLACE INTO group_keys (groupId, userId, chainKey, version) VALUES (?, ?, ?, 1)',
      [groupId, req.user.id, chainKey]
    );

    // Get all other members
    const members = query('SELECT userId FROM group_members WHERE groupId = ? AND userId != ?',
      [groupId, req.user.id]
    );

    saveDB();

    res.json({
      success: true,
      chainKey,
      version: 1,
      memberCount: members.length,
      members: members.map(m => m.userId)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to initialize group encryption' });
  }
});

// Distribute encrypted chain key to a member
router.post('/group/:groupId/distribute', auth, (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const { recipientId, encryptedChainKey, nonce, version } = req.body;

    if (!recipientId || !encryptedChainKey || !nonce) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify sender has the chain key
    const senderKey = queryOne('SELECT * FROM group_keys WHERE groupId = ? AND userId = ?',
      [groupId, req.user.id]
    );
    if (!senderKey) return res.status(403).json({ error: 'No group key available' });

    run(`INSERT INTO group_key_packages (groupId, recipientId, senderId, encryptedChainKey, nonce, version)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [groupId, recipientId, req.user.id, encryptedChainKey, nonce, version || senderKey.version]
    );

    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to distribute key' });
  }
});

// Fetch pending group key packages
router.get('/group/:groupId/keys', auth, (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const packages = query(
      'SELECT * FROM group_key_packages WHERE groupId = ? AND recipientId = ? AND delivered = 0',
      [groupId, req.user.id]
    );
    res.json({ packages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch key packages' });
  }
});

// Acknowledge key package receipt
router.delete('/group/:groupId/keys/:packageId', auth, (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const packageId = parseInt(req.params.packageId);

    run('UPDATE group_key_packages SET delivered = 1 WHERE id = ? AND groupId = ? AND recipientId = ?',
      [packageId, groupId, req.user.id]
    );

    // Store the chain key
    const pkg = queryOne('SELECT * FROM group_key_packages WHERE id = ?', [packageId]);
    if (pkg) {
      run('INSERT OR REPLACE INTO group_keys (groupId, userId, chainKey, version) VALUES (?, ?, ?, ?)',
        [groupId, req.user.id, pkg.encryptedChainKey, pkg.version]
      );
    }

    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to acknowledge key' });
  }
});

// Rotate group key (admin only, after member removal)
router.post('/group/:groupId/rotate', auth, (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);

    const member = queryOne('SELECT * FROM group_members WHERE groupId = ? AND userId = ? AND role = ?',
      [groupId, req.user.id, 'admin']
    );
    if (!member) return res.status(403).json({ error: 'Only admin can rotate keys' });

    // Get current version
    const currentKey = queryOne('SELECT MAX(version) as maxVersion FROM group_keys WHERE groupId = ?', [groupId]);
    const newVersion = (currentKey?.maxVersion || 0) + 1;

    // Generate new chain key
    const chainKey = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    // Update admin's key
    run('INSERT OR REPLACE INTO group_keys (groupId, userId, chainKey, version) VALUES (?, ?, ?, ?)',
      [groupId, req.user.id, chainKey, newVersion]
    );

    // Get remaining members
    const members = query('SELECT userId FROM group_members WHERE groupId = ? AND userId != ?',
      [groupId, req.user.id]
    );

    saveDB();

    res.json({
      success: true,
      chainKey,
      version: newVersion,
      memberCount: members.length,
      members: members.map(m => m.userId)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to rotate group key' });
  }
});

// Get disappearing message settings for a group
router.get('/disappearing/:groupId', auth, (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const settings = queryOne(
      'SELECT * FROM disappearing_message_settings WHERE userId = ? AND groupId = ?',
      [req.user.id, groupId]
    );
    res.json(settings || { enabled: 0, durationSeconds: 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Update disappearing message settings
router.put('/disappearing/:groupId', auth, (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const { enabled, durationSeconds } = req.body;

    run(`INSERT OR REPLACE INTO disappearing_message_settings (userId, groupId, enabled, durationSeconds, updatedAt)
      VALUES (?, ?, ?, ?, datetime('now'))`,
      [req.user.id, groupId, enabled ? 1 : 0, durationSeconds || 0]
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

    run('UPDATE device_keys SET isCurrent = 0 WHERE userId = ?', [req.user.id]);

    run(`INSERT INTO device_keys (userId, deviceId, deviceName, identityKeyPublic, identityKeyPrivateEncrypted, signedPreKeyPublic, signedPreKeySignature, oneTimePreKeys, isCurrent, lastSeenAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
      [req.user.id, deviceId, deviceName || 'Unknown device',
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
      [req.user.id]
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

    const current = queryOne('SELECT deviceId FROM device_keys WHERE userId = ? AND isCurrent = 1', [req.user.id]);
    if (current && current.deviceId === deviceId) {
      return res.status(400).json({ error: 'Cannot remove current device' });
    }

    run('DELETE FROM device_keys WHERE userId = ? AND deviceId = ?', [req.user.id, deviceId]);
    run('DELETE FROM ratchet_sessions WHERE (userId = ? OR peerId = ?) AND deviceId = ?', [req.user.id, req.user.id, deviceId]);
    run('DELETE FROM one_time_pre_keys WHERE userId = ? AND deviceId = ?', [req.user.id, deviceId]);

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
    run('UPDATE device_keys SET isCurrent = 0 WHERE userId = ?', [req.user.id]);
    run('UPDATE device_keys SET isCurrent = 1, lastSeenAt = datetime(\'now\') WHERE userId = ? AND deviceId = ?', [req.user.id, deviceId]);
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
    run('UPDATE device_keys SET lastSeenAt = datetime(\'now\') WHERE userId = ? AND deviceId = ?', [req.user.id, deviceId]);
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

// Get typing status for a group
router.get('/typing/:groupId', auth, (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const typing = query(
      'SELECT ti.userId, ti.isTyping, ti.lastUpdated, u.username FROM typing_indicators ti JOIN users u ON ti.userId = u.id WHERE ti.groupId = ? AND ti.isTyping = 1',
      [groupId]
    );
    res.json({ typing });
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
      [req.user.id, token, platform || 'unknown', deviceId || null]);

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
    run('DELETE FROM push_tokens WHERE userId = ? AND token = ?', [req.user.id, token]);
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
      [req.user.id, limit, offset]
    );
    const unread = queryOne(
      'SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND read = 0',
      [req.user.id]
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
      run(`UPDATE notifications SET read = 1 WHERE userId = ? AND id IN (${placeholders})`, [req.user.id, ...ids]);
    } else {
      run('UPDATE notifications SET read = 1 WHERE userId = ?', [req.user.id]);
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
    run("UPDATE messages SET readAt = datetime('now') WHERE id = ? AND receiverId = ?", [messageId, req.user.id]);

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

// Get group members with roles
router.get('/groups/:groupId/members', auth, (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const members = query(
      `SELECT gm.userId, gm.role, gm.muted, gm.banned, gm.joinedAt, u.username, u.firstName, u.lastName
       FROM group_members gm JOIN users u ON gm.userId = u.id
       WHERE gm.groupId = ? ORDER BY gm.role DESC, gm.joinedAt ASC`,
      [groupId]
    );
    res.json({ members });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get members' });
  }
});

// Update member role (admin/owner only)
router.put('/groups/:groupId/members/:userId/role', auth, (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const userId = parseInt(req.params.userId);
    const { role } = req.body;

    const caller = queryOne('SELECT role FROM group_members WHERE groupId = ? AND userId = ?', [groupId, req.user.id]);
    if (!caller || (caller.role !== 'owner' && caller.role !== 'admin')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    if (role === 'owner' && caller.role !== 'owner') {
      return res.status(403).json({ error: 'Only owner can transfer ownership' });
    }

    run('UPDATE group_members SET role = ? WHERE groupId = ? AND userId = ?', [role, groupId, userId]);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Mute/unmute member
router.put('/groups/:groupId/members/:userId/mute', auth, (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const userId = parseInt(req.params.userId);
    const { muted } = req.body;

    const caller = queryOne('SELECT role FROM group_members WHERE groupId = ? AND userId = ?', [groupId, req.user.id]);
    if (!caller || (caller.role !== 'owner' && caller.role !== 'admin')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    run('UPDATE group_members SET muted = ? WHERE groupId = ? AND userId = ?', [muted ? 1 : 0, groupId, userId]);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mute member' });
  }
});

// Kick member
router.delete('/groups/:groupId/members/:userId', auth, (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const userId = parseInt(req.params.userId);

    const caller = queryOne('SELECT role FROM group_members WHERE groupId = ? AND userId = ?', [groupId, req.user.id]);
    if (!caller || (caller.role !== 'owner' && caller.role !== 'admin')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const target = queryOne('SELECT role FROM group_members WHERE groupId = ? AND userId = ?', [groupId, userId]);
    if (target?.role === 'owner') {
      return res.status(403).json({ error: 'Cannot kick owner' });
    }
    if (target?.role === 'admin' && caller.role !== 'owner') {
      return res.status(403).json({ error: 'Only owner can kick admins' });
    }

    run('DELETE FROM group_members WHERE groupId = ? AND userId = ?', [groupId, userId]);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to kick member' });
  }
});

// Ban/unban member
router.put('/groups/:groupId/members/:userId/ban', auth, (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const userId = parseInt(req.params.userId);
    const { banned } = req.body;

    const caller = queryOne('SELECT role FROM group_members WHERE groupId = ? AND userId = ?', [groupId, req.user.id]);
    if (!caller || (caller.role !== 'owner' && caller.role !== 'admin')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const target = queryOne('SELECT role FROM group_members WHERE groupId = ? AND userId = ?', [groupId, userId]);
    if (target?.role === 'owner') {
      return res.status(403).json({ error: 'Cannot ban owner' });
    }

    if (banned) {
      run('DELETE FROM group_members WHERE groupId = ? AND userId = ?', [groupId, userId]);
      run(`INSERT INTO group_members (groupId, userId, role, muted, banned, joinedAt) VALUES (?, ?, 'member', 0, 1, datetime('now'))`,
        [groupId, userId]);
    } else {
      run('DELETE FROM group_members WHERE groupId = ? AND userId = ? AND banned = 1', [groupId, userId]);
    }

    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update ban status' });
  }
});

// Update group settings (owner only)
router.put('/groups/:groupId/settings', auth, (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const { name, description, isPrivate, allowMemberInvite } = req.body;

    const caller = queryOne('SELECT role FROM group_members WHERE groupId = ? AND userId = ?', [groupId, req.user.id]);
    if (!caller || caller.role !== 'owner') {
      return res.status(403).json({ error: 'Only owner can update group settings' });
    }

    if (name !== undefined) run('UPDATE groups SET name = ? WHERE id = ?', [name, groupId]);
    if (description !== undefined) run('UPDATE groups SET description = ? WHERE id = ?', [description, groupId]);
    if (isPrivate !== undefined) run('UPDATE groups SET isPrivate = ? WHERE id = ?', [isPrivate ? 1 : 0, groupId]);
    if (allowMemberInvite !== undefined) run('UPDATE groups SET allowMemberInvite = ? WHERE id = ?', [allowMemberInvite ? 1 : 0, groupId]);

    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Leave group
router.post('/groups/:groupId/leave', auth, (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const member = queryOne('SELECT role FROM group_members WHERE groupId = ? AND userId = ?', [groupId, req.user.id]);

    if (!member) return res.status(404).json({ error: 'Not a member' });
    if (member.role === 'owner') return res.status(400).json({ error: 'Owner cannot leave. Transfer ownership first.' });

    run('DELETE FROM group_members WHERE groupId = ? AND userId = ?', [groupId, req.user.id]);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

// Transfer ownership
router.put('/groups/:groupId/transfer', auth, (req, res) => {
  try {
    const groupId = parseInt(req.params.groupId);
    const { newOwnerId } = req.body;

    const caller = queryOne('SELECT role FROM group_members WHERE groupId = ? AND userId = ?', [groupId, req.user.id]);
    if (!caller || caller.role !== 'owner') {
      return res.status(403).json({ error: 'Only owner can transfer ownership' });
    }

    const target = queryOne('SELECT role FROM group_members WHERE groupId = ? AND userId = ?', [groupId, newOwnerId]);
    if (!target) return res.status(404).json({ error: 'Target not a member' });

    run('UPDATE group_members SET role = ? WHERE groupId = ? AND userId = ?', ['admin', groupId, req.user.id]);
    run('UPDATE group_members SET role = ? WHERE groupId = ? AND userId = ?', ['owner', groupId, newOwnerId]);

    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to transfer ownership' });
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
      [req.user.id]
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
    run('INSERT OR IGNORE INTO user_sticker_packs (userId, packId, addedAt) VALUES (?, ?, datetime(\'now\'))', [req.user.id, packId]);
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
    run('DELETE FROM user_sticker_packs WHERE userId = ? AND packId = ?', [req.user.id, packId]);
    saveDB();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to uninstall pack' });
  }
});

// Initiate a call
router.post('/calls/initiate', auth, (req, res) => {
  try {
    const { receiverId, groupId, callType } = req.body;

    const session = run(`INSERT INTO call_sessions (callerId, receiverId, groupId, callType, status, startedAt)
      VALUES (?, ?, ?, ?, 'ringing', datetime('now'))`,
      [req.user.id, receiverId || null, groupId || null, callType || 'voice']);

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
      [req.user.id, req.user.id, limit]
    );
    res.json({ calls });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get call history' });
  }
});

// Get thread messages (replies to a message)
router.get('/messages/:messageId/thread', auth, (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;

    const messages = query(
      `SELECT m.*, u.username, u.firstName, u.lastName
       FROM messages m JOIN users u ON m.senderId = u.id
       WHERE m.threadId = ? OR m.replyToId = ?
       ORDER BY m.createdAt ASC LIMIT ? OFFSET ?`,
      [messageId, messageId, limit, offset]
    );

    const count = queryOne(
      'SELECT COUNT(*) as count FROM messages WHERE threadId = ? OR replyToId = ?',
      [messageId, messageId]
    );

    res.json({ messages, total: count?.count || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get thread' });
  }
});

// Get message with reply count
router.get('/messages/:messageId/details', auth, (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const message = queryOne(
      `SELECT m.*, u.username, u.firstName, u.lastName
       FROM messages m JOIN users u ON m.senderId = u.id
       WHERE m.id = ?`,
      [messageId]
    );

    if (!message) return res.status(404).json({ error: 'Message not found' });

    const replyCount = queryOne(
      'SELECT COUNT(*) as count FROM messages WHERE replyToId = ?',
      [messageId]
    );

    const threadCount = queryOne(
      'SELECT COUNT(*) as count FROM messages WHERE threadId = ?',
      [messageId]
    );

    res.json({
      message,
      replyCount: replyCount?.count || 0,
      threadCount: threadCount?.count || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get message details' });
  }
});

// Upload voice message
router.post('/messages/voice', auth, (req, res) => {
  try {
    const { receiverId, groupId, voiceData, voiceDuration, content, threadId, replyToId } = req.body;

    if (!voiceData) return res.status(400).json({ error: 'voiceData required' });

    const result = run(
      `INSERT INTO messages (senderId, receiverId, groupId, content, messageType, voiceData, voiceDuration, threadId, replyToId, createdAt)
       VALUES (?, ?, ?, ?, 'voice', ?, ?, ?, ?, datetime('now'))`,
      [req.user.id, receiverId || null, groupId || null, content || '', Buffer.from(voiceData, 'base64'), voiceDuration || 0, threadId || null, replyToId || null]
    );

    saveDB();
    res.json({ success: true, messageId: result.lastId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save voice message' });
  }
});

// Get voice message audio
router.get('/messages/:messageId/voice', auth, (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId);
    const message = queryOne('SELECT voiceData, voiceDuration FROM messages WHERE id = ? AND messageType = ?', [messageId, 'voice']);

    if (!message || !message.voiceData) {
      return res.status(404).json({ error: 'Voice message not found' });
    }

    res.json({
      audio: message.voiceData.toString('base64'),
      duration: message.voiceDuration
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get voice message' });
  }
});

export default router;
