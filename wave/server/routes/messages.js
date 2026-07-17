import { Router } from 'express';
import { auth } from '../auth.js';
import { query, queryOne, run } from '../db.js';

const router = Router();

router.get('/unread/count', auth, (req, res) => {
  try {
    const result = queryOne(`
      SELECT COUNT(*) as count FROM messages m
      JOIN group_members gm ON m.groupId = gm.groupId
      WHERE gm.userId = ? AND m.senderId != ? AND m.read = 0
    `, [req.user.id, req.user.id]);
    res.json({ count: result ? result.count : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/group/:groupId', auth, (req, res) => {
  try {
    const membership = queryOne('SELECT * FROM group_members WHERE groupId = ? AND userId = ?', [req.params.groupId, req.user.id]);
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    const messages = query(`
      SELECT m.*, u.username as senderName, u.firstName as senderFirstName, u.lastName as senderLastName, u.avatar as senderAvatar
      FROM messages m
      JOIN users u ON m.senderId = u.id
      WHERE m.groupId = ?
      ORDER BY m.createdAt DESC
      LIMIT 50
    `, [req.params.groupId]);

    run('UPDATE messages SET read = 1 WHERE groupId = ? AND senderId != ? AND read = 0', [req.params.groupId, req.user.id]);

    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/group/:groupId', auth, (req, res) => {
  try {
    const membership = queryOne('SELECT * FROM group_members WHERE groupId = ? AND userId = ?', [req.params.groupId, req.user.id]);
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    const { content, replyToId } = req.body;
    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const result = run(
      'INSERT INTO messages (groupId, senderId, content, replyToId) VALUES (?, ?, ?, ?)',
      [req.params.groupId, req.user.id, content.trim(), replyToId || null]
    );

    const message = queryOne(`
      SELECT m.*, u.username as senderName, u.firstName as senderFirstName, u.lastName as senderLastName, u.avatar as senderAvatar
      FROM messages m
      JOIN users u ON m.senderId = u.id
      WHERE m.id = ?
    `, [result.lastId]);

    const members = query('SELECT userId FROM group_members WHERE groupId = ? AND userId != ?', [req.params.groupId, req.user.id]);
    for (const member of members) {
      run('INSERT INTO notifications (userId, fromUserId, type, referenceId) VALUES (?, ?, ?, ?)',
        [member.userId, req.user.id, 'new_message', req.params.groupId]);
    }

    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
