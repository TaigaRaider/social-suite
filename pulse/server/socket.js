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

    socket.on('message:send', (data) => {
      const { conversationId, content } = data;
      if (!conversationId || !content?.trim()) return;

      const member = queryOne(
        'SELECT id FROM conversation_members WHERE conversationId = ? AND userId = ?',
        [conversationId, userId]
      );
      if (!member) return;

      const result = run(
        'INSERT INTO messages (conversationId, senderId, content) VALUES (?, ?, ?)',
        [conversationId, userId, content.trim()]
      );

      const message = queryOne(
        `SELECT m.*, u.username as senderUsername, u.firstName as senderFirstName, u.lastName as senderLastName, u.avatar as senderAvatar
         FROM messages m JOIN users u ON m.senderId = u.id WHERE m.id = ?`,
        [result.lastId]
      );

      io.to(`conv:${conversationId}`).emit('message:new', { conversationId, message });

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

    socket.on('typing:start', (conversationId) => {
      const member = queryOne(
        'SELECT id FROM conversation_members WHERE conversationId = ? AND userId = ?',
        [conversationId, userId]
      );
      if (!member) return;

      socket.to(`conv:${conversationId}`).emit('typing:update', {
        conversationId,
        userId,
        isTyping: true
      });
    });

    socket.on('typing:stop', (conversationId) => {
      socket.to(`conv:${conversationId}`).emit('typing:update', {
        conversationId,
        userId,
        isTyping: false
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
  });

  return io;
}
