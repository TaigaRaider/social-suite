import { Router } from 'express';
import { query, queryOne, run } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.post('/read-receipts', auth, (req, res) => {
  const { messageIds } = req.body;
  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    return res.status(400).json({ error: 'messageIds array is required' });
  }
  const placeholders = messageIds.map(() => '?').join(',');
  const messages = query(
    `SELECT m.id, m.groupId, m.senderId FROM messages m
     JOIN group_members gm ON m.groupId = gm.groupId
     WHERE m.id IN (${placeholders}) AND gm.userId = ? AND m.senderId != ?`,
    [...messageIds, req.user.id, req.user.id]
  );
  for (const msg of messages) {
    run('UPDATE messages SET read = 1, readAt = CURRENT_TIMESTAMP WHERE id = ?', [msg.id]);
  }
  res.json({ updated: messages.length });
});

router.get('/read-status/:groupId', auth, (req, res) => {
  const membership = queryOne('SELECT * FROM group_members WHERE groupId = ? AND userId = ?', [req.params.groupId, req.user.id]);
  if (!membership) return res.status(403).json({ error: 'Not a member' });
  const messages = query(`
    SELECT m.id, m.senderId, m.read, m.createdAt, m.readAt
    FROM messages m WHERE m.groupId = ? AND m.senderId = ?
    ORDER BY m.id DESC LIMIT 50
  `, [req.params.groupId, req.user.id]);
  res.json(messages);
});

router.post('/message-reaction', auth, (req, res) => {
  const { messageId, emoji } = req.body;
  if (!messageId || !emoji) return res.status(400).json({ error: 'messageId and emoji are required' });
  const membership = queryOne(
    `SELECT gm.id FROM group_members gm
     JOIN messages m ON m.groupId = gm.groupId
     WHERE m.id = ? AND gm.userId = ?`,
    [messageId, req.user.id]
  );
  if (!membership) return res.status(404).json({ error: 'Access denied' });

  const existing = queryOne('SELECT id, emoji FROM reactions WHERE targetId = ? AND targetType = ? AND userId = ?', [messageId, 'message', req.user.id]);
  if (existing) {
    if (existing.emoji === emoji) { run('DELETE FROM reactions WHERE id = ?', [existing.id]); return res.json({ removed: true, emoji }); }
    run('UPDATE reactions SET emoji = ? WHERE id = ?', [emoji, existing.id]);
    return res.json({ removed: false, emoji });
  }
  run('INSERT INTO reactions (targetId, targetType, userId, emoji) VALUES (?, ?, ?, ?)', [messageId, 'message', req.user.id, emoji]);
  res.json({ removed: false, emoji });
});

router.get('/message-reactions/:messageId', auth, (req, res) => {
  const reactions = query('SELECT r.emoji, r.userId, u.username, u.avatar FROM reactions r JOIN users u ON r.userId = u.id WHERE r.targetId = ? AND r.targetType = "message"', [req.params.messageId]);
  res.json(reactions);
});

router.get('/smart-replies/:groupId', auth, (req, res) => {
  const membership = queryOne('SELECT * FROM group_members WHERE groupId = ? AND userId = ?', [req.params.groupId, req.user.id]);
  if (!membership) return res.status(403).json({ error: 'Not a member' });

  const lastMessages = query('SELECT m.content, m.senderId FROM messages m WHERE m.groupId = ? ORDER BY m.id DESC LIMIT 5', [req.params.groupId]);
  if (lastMessages.length === 0) return res.json({ suggestions: [] });

  const lastMsg = lastMessages[0];
  const suggestions = [];

  if (lastMsg.senderId !== req.user.id) {
    const content = lastMsg.content.toLowerCase();
    if (content.match(/^(hi|hey|hello|howdy|sup|yo)\b/)) suggestions.push('Hey! 👋', 'Hi there!', 'Hello!');
    else if (content.match(/\?$/)) suggestions.push('Yes', 'No', 'Let me check');
    else if (content.match(/\b(thanks|thank you|thx|ty)\b/)) suggestions.push('You\'re welcome!', 'No problem!', 'Anytime!');
    else if (content.match(/\b(good morning|gm)\b/)) suggestions.push('Good morning! ☀️', 'Morning! How\'s everyone?');
    else if (content.match(/\b(good night|gn)\b/)) suggestions.push('Good night! 🌙', 'Sleep well!');
    else if (content.match(/\b(lol|haha|lmao)\b/)) suggestions.push('😂', '😄', 'I know right!');
    else suggestions.push('👍', 'Ok!', 'Got it!');
  }

  res.json({ suggestions: suggestions.slice(0, 5) });
});

export default router;
