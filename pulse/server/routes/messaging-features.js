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
    `SELECT m.id, m.conversationId, m.senderId FROM messages m
     JOIN conversation_members cm ON m.conversationId = cm.conversationId
     WHERE m.id IN (${placeholders}) AND cm.userId = ? AND m.senderId != ?`,
    [...messageIds, req.userId, req.userId]
  );

  for (const msg of messages) {
    run('UPDATE messages SET read = 1 WHERE id = ?', [msg.id]);
  }

  res.json({ updated: messages.length });
});

router.get('/read-status/:conversationId', auth, (req, res) => {
  const member = queryOne(
    'SELECT id FROM conversation_members WHERE conversationId = ? AND userId = ?',
    [req.params.conversationId, req.userId]
  );
  if (!member) return res.status(403).json({ error: 'Not a member' });

  const messages = query(`
    SELECT m.id, m.senderId, m.read, m.createdAt,
      CASE WHEN m.read = 1 THEN m.readAt ELSE NULL END as readAt
    FROM messages m
    WHERE m.conversationId = ? AND m.senderId = ?
    ORDER BY m.id DESC LIMIT 50
  `, [req.params.conversationId, req.userId]);

  res.json(messages);
});

router.post('/message-reaction', auth, (req, res) => {
  const { messageId, emoji } = req.body;
  if (!messageId || !emoji) return res.status(400).json({ error: 'messageId and emoji are required' });

  const message = queryOne(
    `SELECT m.id FROM messages m
     JOIN conversation_members cm ON m.conversationId = cm.conversationId
     WHERE m.id = ? AND cm.userId = ?`,
    [messageId, req.userId]
  );
  if (!message) return res.status(404).json({ error: 'Message not found or access denied' });

  const existing = queryOne(
    'SELECT id, emoji FROM reactions WHERE targetId = ? AND targetType = ? AND userId = ?',
    [messageId, 'message', req.userId]
  );

  if (existing) {
    if (existing.emoji === emoji) {
      run('DELETE FROM reactions WHERE id = ?', [existing.id]);
      return res.json({ removed: true, emoji });
    }
    run('UPDATE reactions SET emoji = ? WHERE id = ?', [emoji, existing.id]);
    return res.json({ removed: false, emoji });
  }

  run('INSERT INTO reactions (targetId, targetType, userId, emoji) VALUES (?, ?, ?, ?)',
    [messageId, 'message', req.userId, emoji]);
  res.json({ removed: false, emoji });
});

router.get('/message-reactions/:messageId', auth, (req, res) => {
  const reactions = query(`
    SELECT r.emoji, r.userId, u.username, u.avatar
    FROM reactions r JOIN users u ON r.userId = u.id
    WHERE r.targetId = ? AND r.targetType = 'message'
  `, [req.params.messageId]);
  res.json(reactions);
});

router.get('/smart-replies/:conversationId', auth, (req, res) => {
  const member = queryOne(
    'SELECT id FROM conversation_members WHERE conversationId = ? AND userId = ?',
    [req.params.conversationId, req.userId]
  );
  if (!member) return res.status(403).json({ error: 'Not a member' });

  const lastMessages = query(`
    SELECT m.content, m.senderId FROM messages m
    WHERE m.conversationId = ?
    ORDER BY m.id DESC LIMIT 5
  `, [req.params.conversationId]);

  if (lastMessages.length === 0) return res.json({ suggestions: [] });

  const lastMsg = lastMessages[0];
  const suggestions = [];

  if (lastMsg.senderId !== req.userId) {
    const content = lastMsg.content.toLowerCase();

    if (content.match(/^(hi|hey|hello|howdy|sup|yo)\b/)) {
      suggestions.push('Hey! 👋', 'Hi there!', 'Hello!');
    } else if (content.match(/\?$/)) {
      suggestions.push('Yes', 'No', 'Let me think about it');
    } else if (content.match(/\b(thanks|thank you|thx|ty)\b/)) {
      suggestions.push('You\'re welcome!', 'No problem!', 'Anytime!');
    } else if (content.match(/\b(love you|ily|❤️|❤)\b/)) {
      suggestions.push('Love you too! ❤️', 'Aww 🥰', '❤️');
    } else if (content.match(/\b(good morning|gm)\b/)) {
      suggestions.push('Good morning! ☀️', 'Morning! How are you?');
    } else if (content.match(/\b(good night|gn)\b/)) {
      suggestions.push('Good night! 🌙', 'Sleep well!');
    } else if (content.match(/\b(busy|working|busy)\b/)) {
      suggestions.push('No worries, take your time!', 'Ok, talk later!');
    } else if (content.match(/\b(lol|haha|lmao|rofl)\b/)) {
      suggestions.push('😂', '😄', 'I know right!');
    } else {
      suggestions.push('👍', 'Ok!', 'Sounds good!');
    }
  }

  res.json({ suggestions: suggestions.slice(0, 5) });
});

export default router;
