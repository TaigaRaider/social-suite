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

router.put('/group/:groupId/messages/:messageId', auth, (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Content is required' });

    const membership = queryOne('SELECT * FROM group_members WHERE groupId = ? AND userId = ?', [req.params.groupId, req.user.id]);
    if (!membership) return res.status(403).json({ error: 'Not a member' });

    const message = queryOne('SELECT m.id, m.senderId FROM messages m WHERE m.id = ? AND m.groupId = ?', [req.params.messageId, req.params.groupId]);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.senderId !== req.user.id) return res.status(403).json({ error: 'Can only edit your own messages' });

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const msgTime = queryOne('SELECT createdAt FROM messages WHERE id = ?', [req.params.messageId]);
    if (msgTime && msgTime.createdAt < fiveMinAgo) {
      return res.status(400).json({ error: 'Can only edit messages within 5 minutes' });
    }

    run('UPDATE messages SET content = ?, edited = 1 WHERE id = ?', [content.trim(), req.params.messageId]);
    const updated = queryOne(`
      SELECT m.*, u.username as senderName, u.firstName as senderFirstName, u.lastName as senderLastName, u.avatar as senderAvatar
      FROM messages m JOIN users u ON m.senderId = u.id WHERE m.id = ?
    `, [req.params.messageId]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/group/:groupId/messages/:messageId', auth, (req, res) => {
  try {
    const message = queryOne('SELECT m.id, m.senderId FROM messages m WHERE m.id = ? AND m.groupId = ?', [req.params.messageId, req.params.groupId]);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.senderId !== req.user.id) return res.status(403).json({ error: 'Can only delete your own messages' });

    run('DELETE FROM messages WHERE id = ?', [req.params.messageId]);
    res.json({ success: true, deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/typing/:groupId', auth, (req, res) => {
  try {
    const expiresAt = new Date(Date.now() + 5000).toISOString();
    run('DELETE FROM typing WHERE userId = ? AND targetId = ?', [req.user.id, req.params.groupId]);
    run('INSERT INTO typing (userId, targetId, expiresAt) VALUES (?, ?, ?)', [req.user.id, req.params.groupId, expiresAt]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/typing/:groupId', auth, (req, res) => {
  try {
    const now = new Date().toISOString();
    const typers = query(
      `SELECT t.userId, u.username, u.firstName, u.lastName
       FROM typing t JOIN users u ON t.userId = u.id
       WHERE t.targetId = ? AND t.userId != ? AND t.expiresAt > ?`,
      [req.params.groupId, req.user.id, now]
    );
    res.json(typers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/mark-read/:groupId', auth, (req, res) => {
  try {
    const membership = queryOne('SELECT * FROM group_members WHERE groupId = ? AND userId = ?', [req.params.groupId, req.user.id]);
    if (!membership) return res.status(403).json({ error: 'Not a member of this group' });

    run('UPDATE messages SET read = 1 WHERE groupId = ? AND senderId != ? AND read = 0', [req.params.groupId, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/search', auth, (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) return res.json([]);
    const term = `%${q.trim()}%`;
    const results = query(
      `SELECT m.id, m.content, m.createdAt, m.groupId, m.senderId, m.read,
              u.username as senderName, u.firstName as senderFirstName, u.lastName as senderLastName,
              g.name as groupName
       FROM messages m
       JOIN users u ON m.senderId = u.id
       JOIN groups g ON m.groupId = g.id
       JOIN group_members gm ON m.groupId = gm.groupId AND gm.userId = ?
       WHERE m.content LIKE ?
       ORDER BY m.createdAt DESC LIMIT 30`,
      [req.user.id, term]
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
