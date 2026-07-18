import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { query, queryOne, run } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
const SECRET = JWT_SECRET || 'wave-ws-secret';

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
      socket.username = decoded.username;
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

    socket.on('group:join', (groupId) => {
      const member = queryOne('SELECT id FROM group_members WHERE groupId = ? AND userId = ?', [groupId, userId]);
      if (member) {
        socket.join(`group:${groupId}`);
      }
    });

    socket.on('group:leave', (groupId) => {
      socket.leave(`group:${groupId}`);
    });

    socket.on('message:send', (data) => {
      const { groupId, content, replyToId } = data;
      if (!groupId || !content?.trim()) return;

      const membership = queryOne('SELECT id FROM group_members WHERE groupId = ? AND userId = ?', [groupId, userId]);
      if (!membership) return;

      const result = run(
        'INSERT INTO messages (groupId, senderId, content, replyToId) VALUES (?, ?, ?, ?)',
        [groupId, userId, content.trim(), replyToId || null]
      );

      const message = queryOne(`
        SELECT m.*, u.username as senderName, u.firstName as senderFirstName, u.lastName as senderLastName, u.avatar as senderAvatar
        FROM messages m JOIN users u ON m.senderId = u.id WHERE m.id = ?
      `, [result.lastId]);

      io.to(`group:${groupId}`).emit('message:new', { groupId, message });

      const members = query('SELECT userId FROM group_members WHERE groupId = ? AND userId != ?', [groupId, userId]);
      const sender = queryOne('SELECT username, firstName, lastName, avatar FROM users WHERE id = ?', [userId]);
      for (const member of members) {
        const memberSocket = onlineUsers.get(member.userId);
        if (memberSocket) {
          io.to(memberSocket).emit('notification:new', {
            type: 'message',
            fromUser: sender,
            groupId,
            messageId: result.lastId
          });
        }
      }
    });

    socket.on('message:read', (data) => {
      const { groupId, messageIds } = data;
      if (!groupId || !messageIds?.length) return;

      const placeholders = messageIds.map(() => '?').join(',');
      run(
        `UPDATE messages SET read = 1, readAt = CURRENT_TIMESTAMP WHERE id IN (${placeholders}) AND senderId != ?`,
        [...messageIds, userId]
      );

      io.to(`group:${groupId}`).emit('message:read:ack', {
        groupId,
        messageIds,
        readBy: userId,
        readAt: new Date().toISOString()
      });
    });

    socket.on('typing:start', (groupId) => {
      const membership = queryOne('SELECT id FROM group_members WHERE groupId = ? AND userId = ?', [groupId, userId]);
      if (!membership) return;

      socket.to(`group:${groupId}`).emit('typing:update', {
        groupId,
        userId,
        username: socket.username,
        isTyping: true
      });
    });

    socket.on('typing:stop', (groupId) => {
      socket.to(`group:${groupId}`).emit('typing:update', {
        groupId,
        userId,
        username: socket.username,
        isTyping: false
      });
    });

    socket.on('group:create', (data) => {
      const { name, description, memberIds } = data;
      if (!name || !memberIds?.length) return;

      const result = run('INSERT INTO groups (name, description, createdBy) VALUES (?, ?, ?)', [name, description || '', userId]);
      const groupId = result.lastId;
      run('INSERT INTO group_members (groupId, userId, role) VALUES (?, ?, ?)', [groupId, userId, 'admin']);
      for (const memberId of memberIds) {
        run('INSERT INTO group_members (groupId, userId) VALUES (?, ?)', [groupId, memberId]);
      }

      io.to(`group:${groupId}`).emit('group:created', { groupId, name });

      for (const memberId of memberIds) {
        const memberSocket = onlineUsers.get(memberId);
        if (memberSocket) {
          io.to(memberSocket).emit('group:invited', { groupId, name, createdBy: userId });
        }
      }
    });

    socket.on('message:react', (data) => {
      const { messageId, groupId, emoji } = data;
      if (!messageId || !emoji) return;

      const membership = queryOne(
        `SELECT gm.id FROM group_members gm JOIN messages m ON m.groupId = gm.groupId WHERE m.id = ? AND gm.userId = ?`,
        [messageId, userId]
      );
      if (!membership) return;

      const existing = queryOne('SELECT id, emoji FROM reactions WHERE targetId = ? AND targetType = ? AND userId = ?', [messageId, 'message', userId]);
      if (existing) {
        if (existing.emoji === emoji) {
          run('DELETE FROM reactions WHERE id = ?', [existing.id]);
          io.to(`group:${groupId}`).emit('message:reaction:removed', { messageId, userId, groupId });
        } else {
          run('UPDATE reactions SET emoji = ? WHERE id = ?', [emoji, existing.id]);
          io.to(`group:${groupId}`).emit('message:reaction:new', { messageId, userId, emoji, groupId });
        }
      } else {
        run('INSERT INTO reactions (targetId, targetType, userId, emoji) VALUES (?, ?, ?, ?)', [messageId, 'message', userId, emoji]);
        io.to(`group:${groupId}`).emit('message:reaction:new', { messageId, userId, emoji, groupId });
      }
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      run('UPDATE users SET status = ?, lastSeen = CURRENT_TIMESTAMP WHERE id = ?', ['offline', userId]);
      io.emit('user:offline', { userId, status: 'offline' });
    });
  });

  return io;
}
