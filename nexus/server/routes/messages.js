import { Router } from 'express';
import { query, queryOne, run } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.get('/conversations', auth, (req, res) => {
  const conversations = query(`
    SELECT u.id, u.username, u.firstName, u.lastName, u.avatar,
      m.content as lastMessage, m.createdAt as lastMessageAt, m.senderId as lastSender,
      (SELECT COUNT(*) FROM messages WHERE senderId = u.id AND receiverId = ? AND read = 0) as unreadCount
    FROM messages m
    JOIN users u ON u.id = CASE WHEN m.senderId = ? THEN m.receiverId ELSE m.senderId END
    WHERE (m.senderId = ? OR m.receiverId = ?)
    AND m.id = (
      SELECT MAX(id) FROM messages
      WHERE (senderId = CASE WHEN m.senderId = ? THEN m.receiverId ELSE m.senderId END
        AND receiverId = ?) OR (senderId = ? AND receiverId = CASE WHEN m.senderId = ? THEN m.receiverId ELSE m.senderId END)
    )
    GROUP BY u.id
    ORDER BY m.createdAt DESC
  `, [req.userId, req.userId, req.userId, req.userId, req.userId, req.userId, req.userId, req.userId]);
  res.json(conversations);
});

router.get('/unread/count', auth, (req, res) => {
  const result = queryOne('SELECT COUNT(*) as count FROM messages WHERE receiverId = ? AND read = 0', [req.userId]);
  res.json({ count: result.count });
});

router.get('/:userId', auth, (req, res) => {
  const messages = query(`
    SELECT m.*, s.username as senderUsername, s.firstName as senderFirstName, s.lastName as senderLastName,
      r.username as receiverUsername, r.firstName as receiverFirstName, r.lastName as receiverLastName
    FROM messages m
    JOIN users s ON m.senderId = s.id
    JOIN users r ON m.receiverId = r.id
    WHERE (m.senderId = ? AND m.receiverId = ?) OR (m.senderId = ? AND m.receiverId = ?)
    ORDER BY m.createdAt ASC
  `, [req.userId, req.params.userId, req.params.userId, req.userId]);
  run('UPDATE messages SET read = 1 WHERE senderId = ? AND receiverId = ? AND read = 0', [req.params.userId, req.userId]);
  res.json(messages);
});

router.post('/:userId', auth, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Message content required' });
  const result = run('INSERT INTO messages (senderId, receiverId, content) VALUES (?, ?, ?)', [req.userId, req.params.userId, content]);
  const message = queryOne('SELECT * FROM messages WHERE id = ?', [result.lastInsertRowid]);
  run('INSERT INTO notifications (userId, fromUserId, type, referenceId) VALUES (?, ?, ?, ?)', [req.params.userId, req.userId, 'message', message.id]);
  res.json(message);
});

export default router;
