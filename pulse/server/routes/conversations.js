import { Router } from 'express';
import { query, queryOne, run } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.get('/unread/count', auth, (req, res) => {
  const result = queryOne(
    `SELECT COUNT(*) as count FROM messages m
     JOIN conversation_members cm ON m.conversationId = cm.conversationId
     WHERE cm.userId = ? AND m.senderId != ? AND m.read = 0`,
    [req.userId, req.userId]
  );
  res.json({ count: result ? result.count : 0 });
});

router.get('/', auth, (req, res) => {
  const conversations = query(
    `SELECT c.id, c.createdAt,
      m.id as lastMessageId, m.content as lastMessage, m.createdAt as lastMessageTime, m.senderId as lastMessageSenderId,
      u.id as otherUserId, u.username as otherUsername, u.firstName as otherFirstName, u.lastName as otherLastName,
      u.avatar as otherAvatar, u.status as otherStatus, u.lastSeen as otherLastSeen,
      (SELECT COUNT(*) FROM messages WHERE conversationId = c.id AND senderId != ? AND read = 0) as unreadCount
     FROM conversations c
     JOIN conversation_members cm ON c.id = cm.conversationId
     JOIN conversation_members cm2 ON c.id = cm2.conversationId AND cm2.userId != ?
     JOIN users u ON cm2.userId = u.id
     LEFT JOIN messages m ON c.id = m.conversationId AND m.id = (
       SELECT MAX(id) FROM messages WHERE conversationId = c.id
     )
     WHERE cm.userId = ?
     ORDER BY COALESCE(m.createdAt, c.createdAt) DESC`,
    [req.userId, req.userId, req.userId]
  );
  res.json(conversations);
});

router.post('/', auth, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const existing = queryOne(
    `SELECT c.id FROM conversations c
     JOIN conversation_members cm1 ON c.id = cm1.conversationId AND cm1.userId = ?
     JOIN conversation_members cm2 ON c.id = cm2.conversationId AND cm2.userId = ?
     WHERE (SELECT COUNT(*) FROM conversation_members WHERE conversationId = c.id) = 2`,
    [req.userId, userId]
  );

  if (existing) {
    const conversation = await buildConversationResponse(existing.id, req.userId);
    return res.json(conversation);
  }

  const result = run('INSERT INTO conversations DEFAULT VALUES');
  const convId = result.lastId;
  run('INSERT INTO conversation_members (conversationId, userId) VALUES (?, ?)', [convId, req.userId]);
  run('INSERT INTO conversation_members (conversationId, userId) VALUES (?, ?)', [convId, userId]);

  const conversation = await buildConversationResponse(convId, req.userId);
  res.json(conversation);
});

router.get('/:id/messages', auth, (req, res) => {
  const member = queryOne(
    'SELECT id FROM conversation_members WHERE conversationId = ? AND userId = ?',
    [req.params.id, req.userId]
  );
  if (!member) return res.status(403).json({ error: 'Not a member' });

  const messages = query(
    `SELECT m.*, u.username as senderUsername, u.firstName as senderFirstName, u.lastName as senderLastName, u.avatar as senderAvatar
     FROM messages m JOIN users u ON m.senderId = u.id
     WHERE m.conversationId = ?
     ORDER BY m.createdAt DESC LIMIT 50`,
    [req.params.id]
  );

  run('UPDATE messages SET read = 1 WHERE conversationId = ? AND senderId != ? AND read = 0', [req.params.id, req.userId]);

  res.json(messages.reverse());
});

router.post('/:id/messages', auth, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Content is required' });

  const member = queryOne(
    'SELECT id FROM conversation_members WHERE conversationId = ? AND userId = ?',
    [req.params.id, req.userId]
  );
  if (!member) return res.status(403).json({ error: 'Not a member' });

  const result = run(
    'INSERT INTO messages (conversationId, senderId, content) VALUES (?, ?, ?)',
    [req.params.id, req.userId, content.trim()]
  );

  const message = queryOne(
    `SELECT m.*, u.username as senderUsername, u.firstName as senderFirstName, u.lastName as senderLastName, u.avatar as senderAvatar
     FROM messages m JOIN users u ON m.senderId = u.id WHERE m.id = ?`,
    [result.lastId]
  );

  const otherMember = queryOne(
    'SELECT userId FROM conversation_members WHERE conversationId = ? AND userId != ?',
    [req.params.id, req.userId]
  );

  if (otherMember) {
    run(
      'INSERT INTO notifications (userId, fromUserId, type, referenceId) VALUES (?, ?, ?, ?)',
      [otherMember.userId, req.userId, 'message', result.lastId]
    );
  }

  res.json(message);
});

router.put('/:id/messages/:messageId', auth, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Content is required' });

  const message = queryOne(
    'SELECT m.id, m.senderId, m.conversationId FROM messages m WHERE m.id = ? AND m.conversationId = ?',
    [req.params.messageId, req.params.id]
  );
  if (!message) return res.status(404).json({ error: 'Message not found' });
  if (message.senderId !== req.userId) return res.status(403).json({ error: 'Can only edit your own messages' });

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const msgTime = queryOne('SELECT createdAt FROM messages WHERE id = ?', [req.params.messageId]);
  if (msgTime && msgTime.createdAt < fiveMinAgo) {
    return res.status(400).json({ error: 'Can only edit messages within 5 minutes' });
  }

  run('UPDATE messages SET content = ?, edited = 1 WHERE id = ?', [content.trim(), req.params.messageId]);

  const updated = queryOne(
    `SELECT m.*, u.username as senderUsername, u.firstName as senderFirstName, u.lastName as senderLastName, u.avatar as senderAvatar
     FROM messages m JOIN users u ON m.senderId = u.id WHERE m.id = ?`,
    [req.params.messageId]
  );
  res.json(updated);
});

router.delete('/:id/messages/:messageId', auth, (req, res) => {
  const message = queryOne(
    'SELECT m.id, m.senderId FROM messages m WHERE m.id = ? AND m.conversationId = ?',
    [req.params.messageId, req.params.id]
  );
  if (!message) return res.status(404).json({ error: 'Message not found' });
  if (message.senderId !== req.userId) return res.status(403).json({ error: 'Can only delete your own messages' });

  run('DELETE FROM messages WHERE id = ?', [req.params.messageId]);
  res.json({ success: true, deleted: true });
});

router.post('/typing', auth, (req, res) => {
  const { conversationId } = req.body;
  if (!conversationId) return res.status(400).json({ error: 'conversationId is required' });

  const member = queryOne(
    'SELECT id FROM conversation_members WHERE conversationId = ? AND userId = ?',
    [conversationId, req.userId]
  );
  if (!member) return res.status(403).json({ error: 'Not a member of this conversation' });

  const expiresAt = new Date(Date.now() + 5000).toISOString();
  run('DELETE FROM typing WHERE userId = ? AND targetId = ?', [req.userId, conversationId]);
  run('INSERT INTO typing (userId, targetId, expiresAt) VALUES (?, ?, ?)', [req.userId, conversationId, expiresAt]);
  res.json({ ok: true });
});

router.get('/typing/:conversationId', auth, (req, res) => {
  const member = queryOne(
    'SELECT id FROM conversation_members WHERE conversationId = ? AND userId = ?',
    [req.params.conversationId, req.userId]
  );
  if (!member) return res.status(403).json({ error: 'Not a member of this conversation' });

  const now = new Date().toISOString();
  const typers = query(
    `SELECT t.userId, u.username, u.firstName, u.lastName
     FROM typing t JOIN users u ON t.userId = u.id
     WHERE t.targetId = ? AND t.userId != ? AND t.expiresAt > ?`,
    [req.params.conversationId, req.userId, now]
  );
  res.json(typers);
});

router.get('/search', auth, (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) return res.json([]);
  const term = `%${q.trim()}%`;
  const results = query(
    `SELECT m.id, m.content, m.createdAt, m.conversationId,
            m.senderId, m.read,
            u.username as senderUsername, u.firstName as senderFirstName, u.lastName as senderLastName,
            c2.username as otherUsername, c2.firstName as otherFirstName, c2.lastName as otherLastName
     FROM messages m
     JOIN users u ON m.senderId = u.id
     JOIN conversation_members cm ON m.conversationId = cm.conversationId AND cm.userId = ?
     JOIN conversation_members cm2 ON m.conversationId = cm2.conversationId AND cm2.userId != ?
     JOIN users c2 ON cm2.userId = c2.id
     WHERE m.content LIKE ?
     ORDER BY m.createdAt DESC LIMIT 30`,
    [req.userId, req.userId, term]
  );
  res.json(results);
});

async function buildConversationResponse(convId, userId) {
  const conv = queryOne('SELECT * FROM conversations WHERE id = ?', [convId]);
  const otherUser = queryOne(
    `SELECT u.id, u.username, u.firstName, u.lastName, u.avatar, u.status, u.lastSeen
     FROM users u JOIN conversation_members cm ON u.id = cm.userId
     WHERE cm.conversationId = ? AND cm.userId != ?`,
    [convId, userId]
  );
  const lastMsg = queryOne(
    `SELECT m.*, u.username as senderUsername FROM messages m JOIN users u ON m.senderId = u.id
     WHERE m.conversationId = ? ORDER BY m.id DESC LIMIT 1`,
    [convId]
  );
  return {
    id: conv.id,
    createdAt: conv.createdAt,
    otherUserId: otherUser?.id,
    otherUsername: otherUser?.username,
    otherFirstName: otherUser?.firstName,
    otherLastName: otherUser?.lastName,
    otherAvatar: otherUser?.avatar,
    otherStatus: otherUser?.status,
    otherLastSeen: otherUser?.lastSeen,
    lastMessage: lastMsg?.content || null,
    lastMessageTime: lastMsg?.createdAt || conv.createdAt,
    unreadCount: 0
  };
}

export default router;
