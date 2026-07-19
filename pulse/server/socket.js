import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { query, queryOne, run } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
const SECRET = JWT_SECRET || 'pulse-ws-secret';

export function setupWebSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true
    }
  });

  const onlineUsers = new Map();

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    onlineUsers.set(userId, socket.id);

    run('UPDATE users SET status = ?, lastSeen = CURRENT_TIMESTAMP WHERE id = ?', ['online', userId]);
    io.emit('user:online', { userId, status: 'online' });

    socket.on('device:identify', ({ userId, deviceId }) => {
      socket.join(`user_${userId}_device_${deviceId}`);
    });

    socket.on('conversation:join', (conversationId) => {
      const member = queryOne(
        'SELECT id FROM conversation_members WHERE conversationId = ? AND userId = ?',
        [conversationId, userId]
      );
      if (member) {
        socket.join(`conv:${conversationId}`);
      }
    });

    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conv:${conversationId}`);
    });

    socket.on('typing:start', (peerId) => {
      run(`INSERT OR REPLACE INTO typing_indicators (userId, peerId, isTyping, lastUpdated)
        VALUES (?, ?, 1, datetime('now'))`, [userId, peerId]);
      io.to(`user_${peerId}`).emit('typing:start', { userId, peerId });
    });

    socket.on('typing:stop', (peerId) => {
      run('UPDATE typing_indicators SET isTyping = 0 WHERE userId = ? AND peerId = ?', [userId, peerId]);
      io.to(`user_${peerId}`).emit('typing:stop', { userId, peerId });
    });

    socket.on('heartbeat', () => {
      if (!userId) return;
      run(`INSERT OR REPLACE INTO online_status (userId, isOnline, lastSeenAt)
        VALUES (?, 1, datetime('now'))`, [userId]);
    });

    socket.on('reaction:add', ({ messageId, emoji }) => {
      if (!messageId || !emoji) return;
      try {
        run(`INSERT OR IGNORE INTO message_reactions (messageId, userId, emoji, createdAt)
          VALUES (?, ?, ?, datetime('now'))`, [messageId, userId, emoji]);
        const message = queryOne('SELECT senderId FROM messages WHERE id = ?', [messageId]);
        if (message) {
          io.to(`user_${message.senderId}`).emit('reaction:added', { messageId, userId, emoji });
          io.to(`user_${userId}`).emit('reaction:added', { messageId, userId, emoji });
        }
      } catch (e) { /* ignore duplicates */ }
    });

    socket.on('reaction:remove', ({ messageId, emoji }) => {
      if (!messageId || !emoji) return;
      run('DELETE FROM message_reactions WHERE messageId = ? AND userId = ? AND emoji = ?', [messageId, userId, emoji]);
      const message = queryOne('SELECT senderId FROM messages WHERE id = ?', [messageId]);
      if (message) {
        io.to(`user_${message.senderId}`).emit('reaction:removed', { messageId, userId, emoji });
        io.to(`user_${userId}`).emit('reaction:removed', { messageId, userId, emoji });
      }
    });

    socket.on('reaction:get', ({ messageId }, callback) => {
      if (!messageId) return callback && callback([]);
      const reactions = query(
        'SELECT r.userId, r.emoji, r.createdAt, u.username FROM message_reactions r JOIN users u ON r.userId = u.id WHERE r.messageId = ?',
        [messageId]
      );
      callback && callback(reactions);
    });

    socket.on('users:online', ({ userIds }, callback) => {
      if (!userIds || !Array.isArray(userIds)) return callback && callback({});
      const placeholders = userIds.map(() => '?').join(',');
      const onlineUsersList = query(
        `SELECT userId, isOnline, lastSeenAt FROM online_status WHERE userId IN (${placeholders})`,
        userIds
      );
      const statusMap = {};
      onlineUsersList.forEach(u => {
        statusMap[u.userId] = { isOnline: u.isOnline === 1, lastSeenAt: u.lastSeenAt };
      });
      callback && callback(statusMap);
    });

    socket.on('typing:status', ({ peerId }, callback) => {
      if (!peerId) return callback && callback({ isTyping: false });
      const typing = queryOne(
        'SELECT isTyping FROM typing_indicators WHERE userId = ? AND peerId = ?',
        [peerId, userId]
      );
      callback && callback({ isTyping: typing ? typing.isTyping === 1 : false });
    });

    socket.on('message:send', (data) => {
      const { conversationId, content, ciphertext, nonce, ratchetHeader, replyToId, deviceId } = data;

      const member = queryOne(
        'SELECT * FROM conversation_members WHERE conversationId = ? AND userId = ?',
        [conversationId, userId]
      );
      if (!member) return socket.emit('error', { message: 'Not a member' });

      const isEncrypted = ciphertext && nonce && ratchetHeader;
      const result = run(
        `INSERT INTO messages (conversationId, senderId, content, encrypted, ciphertext, nonce, ratchetHeader, replyToId, deviceId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          conversationId,
          userId,
          isEncrypted ? '[encrypted]' : content,
          isEncrypted ? 1 : 0,
          ciphertext || null,
          nonce || null,
          ratchetHeader ? JSON.stringify(ratchetHeader) : null,
          replyToId || null,
          deviceId || null
        ]
      );

      const message = queryOne(
        `SELECT m.*, u.username as senderUsername, u.firstName as senderFirstName, u.lastName as senderLastName, u.avatar as senderAvatar
         FROM messages m JOIN users u ON m.senderId = u.id WHERE m.id = ?`,
        [result.lastId]
      );

      io.to(`conv:${conversationId}`).emit('message:new', {
        conversationId,
        message: {
          id: message.id,
          senderId: message.senderId,
          content: isEncrypted ? undefined : message.content,
          encrypted: isEncrypted ? 1 : 0,
          ciphertext: message.ciphertext,
          nonce: message.nonce,
          ratchetHeader: message.ratchetHeader ? JSON.parse(message.ratchetHeader) : undefined,
          replyToId: message.replyToId,
          deviceId: message.deviceId,
          createdAt: message.createdAt
        }
      });

      // Multi-device: send to all recipient devices except sender's device
      if (deviceId) {
        const otherMember = queryOne(
          'SELECT userId FROM conversation_members WHERE conversationId = ? AND userId != ?',
          [conversationId, userId]
        );
        if (otherMember) {
          const recipientDevices = query('SELECT deviceId FROM device_keys WHERE userId = ?', [otherMember.userId]);
          recipientDevices.forEach(device => {
            if (device.deviceId !== deviceId) {
              io.to(`user_${otherMember.userId}_device_${device.deviceId}`).emit('message:new', {
                conversationId,
                targetDeviceId: device.deviceId,
                fromDeviceId: deviceId,
                message: {
                  id: message.id,
                  senderId: message.senderId,
                  content: isEncrypted ? undefined : message.content,
                  encrypted: isEncrypted ? 1 : 0,
                  ciphertext: message.ciphertext,
                  nonce: message.nonce,
                  ratchetHeader: message.ratchetHeader ? JSON.parse(message.ratchetHeader) : undefined,
                  replyToId: message.replyToId,
                  deviceId: message.deviceId,
                  createdAt: message.createdAt
                }
              });
            }
          });
        }
      }

      const otherMember = queryOne(
        'SELECT userId FROM conversation_members WHERE conversationId = ? AND userId != ?',
        [conversationId, userId]
      );
      if (otherMember) {
        const sender = queryOne('SELECT username, firstName, lastName, avatar FROM users WHERE id = ?', [userId]);
        io.to(`user:${otherMember.userId}`).emit('notification:new', {
          type: 'message',
          fromUser: sender,
          conversationId,
          messageId: result.lastId
        });
      }
    });

    socket.on('prekey:deliver', (data) => {
      const { recipientId, ephemeralPublic, identityPublic, ciphertext, nonce, mac, usedOneTimeKeyId } = data;

      run(`INSERT INTO prekey_messages (recipientId, senderId, ephemeralPublic, identityPublic, usedOneTimeKeyId, ciphertext, nonce, mac)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [recipientId, userId, ephemeralPublic, identityPublic, usedOneTimeKeyId || null, ciphertext, nonce, mac]
      );

      if (usedOneTimeKeyId) {
        run('UPDATE one_time_pre_keys SET claimed = 1, claimedBy = ?, claimedAt = ? WHERE userId = ? AND keyId = ?',
          [userId, new Date().toISOString(), recipientId, usedOneTimeKeyId]
        );
      }

      const recipientSocket = onlineUsers.get(recipientId);
      if (recipientSocket) {
        io.to(recipientSocket).emit('prekey:message', { senderId: userId });
      }
    });

    socket.on('message:read', (data) => {
      const { conversationId, messageIds } = data;
      if (!conversationId || !messageIds?.length) return;

      const placeholders = messageIds.map(() => '?').join(',');
      run(
        `UPDATE messages SET read = 1, readAt = CURRENT_TIMESTAMP WHERE id IN (${placeholders}) AND senderId != ?`,
        [...messageIds, userId]
      );

      io.to(`conv:${conversationId}`).emit('message:read:ack', {
        conversationId,
        messageIds,
        readBy: userId,
        readAt: new Date().toISOString()
      });
    });

    socket.on('user:status', (status) => {
      const validStatuses = ['online', 'away', 'dnd', 'offline'];
      const s = validStatuses.includes(status) ? status : 'offline';
      run('UPDATE users SET status = ?, lastSeen = CURRENT_TIMESTAMP WHERE id = ?', [s, userId]);
      io.emit('user:status:update', { userId, status: s });
    });

    socket.on('conversation:create', (data) => {
      const { userId: targetUserId } = data;
      if (!targetUserId) return;

      const existing = queryOne(
        `SELECT c.id FROM conversations c
         JOIN conversation_members cm1 ON c.id = cm1.conversationId AND cm1.userId = ?
         JOIN conversation_members cm2 ON c.id = cm2.conversationId AND cm2.userId = ?
         WHERE (SELECT COUNT(*) FROM conversation_members WHERE conversationId = c.id) = 2`,
        [userId, targetUserId]
      );

      if (existing) {
        socket.emit('conversation:created', { conversationId: existing.id });
        return;
      }

      const result = run('INSERT INTO conversations DEFAULT VALUES');
      const convId = result.lastId;
      run('INSERT INTO conversation_members (conversationId, userId) VALUES (?, ?)', [convId, userId]);
      run('INSERT INTO conversation_members (conversationId, userId) VALUES (?, ?)', [convId, targetUserId]);

      const targetSocket = onlineUsers.get(targetUserId);
      if (targetSocket) {
        io.to(targetSocket).emit('conversation:created', { conversationId: convId });
      }
      socket.emit('conversation:created', { conversationId: convId });
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      run('UPDATE users SET status = ?, lastSeen = CURRENT_TIMESTAMP WHERE id = ?', ['offline', userId]);
      io.emit('user:offline', { userId, status: 'offline' });
    });

    // Read receipt (single message)
    socket.on('message:read-single', ({ messageId }) => {
      const userId = socket.userId;
      if (!userId || !messageId) return;

      try {
        run("UPDATE messages SET readAt = datetime('now') WHERE id = ? AND receiverId = ?", [messageId, userId]);

        const message = queryOne('SELECT senderId FROM messages WHERE id = ?', [messageId]);
        if (message) {
          io.to(`user_${message.senderId}`).emit('message:read', { messageId, readBy: userId, readAt: new Date().toISOString() });

          run(`INSERT INTO notifications (userId, fromUserId, type, referenceId, read, createdAt)
            VALUES (?, ?, 'message_read', ?, 0, datetime('now'))`,
            [message.senderId, userId, messageId]);

          const senderOnline = queryOne('SELECT isOnline FROM online_status WHERE userId = ?', [message.senderId]);
          if (!senderOnline || !senderOnline.isOnline) {
            const tokens = query('SELECT token, platform FROM push_tokens WHERE userId = ?', [message.senderId]);
            tokens.forEach(t => {
              console.log(`Push notification queued (read receipt): ${t.token?.slice(0, 10)}... (${t.platform})`);
            });
          }
        }

        saveDB();
      } catch (e) { /* ignore */ }
    });

    // Message delivered
    socket.on('message:delivered', ({ messageId }) => {
      const userId = socket.userId;
      if (!userId || !messageId) return;

      try {
        run("UPDATE messages SET deliveredAt = datetime('now') WHERE id = ? AND deliveredAt IS NULL", [messageId]);

        const message = queryOne('SELECT senderId FROM messages WHERE id = ?', [messageId]);
        if (message) {
          io.to(`user_${message.senderId}`).emit('message:delivered', { messageId, deliveredAt: new Date().toISOString() });
        }
      } catch (e) { /* ignore */ }
    });

    // Typing indicator for group chats
    socket.on('typing:start-group', ({ groupId }) => {
      const userId = socket.userId;
      if (!userId || !groupId) return;

      const members = query('SELECT userId FROM group_members WHERE groupId = ?', [groupId]);
      const user = queryOne('SELECT firstName, lastName, username FROM users WHERE id = ?', [userId]);
      const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Someone';

      members.forEach(m => {
        if (m.userId !== userId) {
          io.to(`user_${m.userId}`).emit('typing:start-group', { groupId, userId, name });
        }
      });
    });

    socket.on('typing:stop-group', ({ groupId }) => {
      const userId = socket.userId;
      if (!userId || !groupId) return;

      const members = query('SELECT userId FROM group_members WHERE groupId = ?', [groupId]);
      members.forEach(m => {
        if (m.userId !== userId) {
          io.to(`user_${m.userId}`).emit('typing:stop-group', { groupId, userId });
        }
      });
    });

    // Notification handlers
    socket.on('notification:read', ({ notificationId }) => {
      const userId = socket.userId;
      if (!userId || !notificationId) return;

      run('UPDATE notifications SET read = 1 WHERE id = ? AND userId = ?', [notificationId, userId]);
    });

    socket.on('notification:readAll', () => {
      const userId = socket.userId;
      if (!userId) return;

      run('UPDATE notifications SET read = 1 WHERE userId = ?', [userId]);
    });

    // Call signaling
    socket.on('call:initiate', ({ receiverId, callType, sessionId }) => {
      const userId = socket.userId;
      if (!userId || !receiverId) return;

      io.to(`user_${receiverId}`).emit('call:incoming', {
        sessionId,
        callerId: userId,
        callType: callType || 'voice'
      });
    });

    socket.on('call:answer', ({ sessionId, receiverId }) => {
      io.to(`user_${receiverId}`).emit('call:answered', { sessionId });
    });

    socket.on('call:reject', ({ sessionId, callerId }) => {
      io.to(`user_${callerId}`).emit('call:rejected', { sessionId });
    });

    socket.on('call:end', ({ sessionId, otherUserId }) => {
      io.to(`user_${otherUserId}`).emit('call:ended', { sessionId });
    });

    // WebRTC signaling relay
    socket.on('call:offer', ({ sessionId, toUserId, offer }) => {
      io.to(`user_${toUserId}`).emit('call:offer', {
        sessionId,
        fromUserId: socket.userId,
        offer
      });
    });

    socket.on('call:answer-signal', ({ sessionId, toUserId, answer }) => {
      io.to(`user_${toUserId}`).emit('call:answer-signal', {
        sessionId,
        fromUserId: socket.userId,
        answer
      });
    });

    socket.on('call:ice-candidate', ({ sessionId, toUserId, candidate }) => {
      io.to(`user_${toUserId}`).emit('call:ice-candidate', {
        sessionId,
        fromUserId: socket.userId,
        candidate
      });
    });

    socket.on('call:mute', ({ sessionId, toUserId, muted }) => {
      io.to(`user_${toUserId}`).emit('call:mute', { sessionId, muted });
    });

    socket.on('call:video-toggle', ({ sessionId, toUserId, enabled }) => {
      io.to(`user_${toUserId}`).emit('call:video-toggle', { sessionId, enabled });
    });

    socket.on('call:screen-share', ({ sessionId, toUserId, sharing }) => {
      io.to(`user_${toUserId}`).emit('call:screen-share', { sessionId, sharing });
    });
  });

  return io;
}
