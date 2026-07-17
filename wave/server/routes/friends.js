import { Router } from 'express';
import { auth } from '../auth.js';
import { query, queryOne, run } from '../db.js';

const router = Router();

router.get('/', auth, (req, res) => {
  try {
    const friends = query(`
      SELECT u.id, u.username, u.email, u.firstName, u.lastName, u.avatar, u.status, u.lastSeen
      FROM friends f
      JOIN users u ON (f.userId2 = u.id AND f.userId1 = ?) OR (f.userId1 = u.id AND f.userId2 = ?)
      WHERE (f.userId1 = ? OR f.userId2 = ?) AND f.status = 'accepted'
    `, [req.user.id, req.user.id, req.user.id, req.user.id]);
    res.json(friends);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/request/:userId', auth, (req, res) => {
  try {
    const targetId = parseInt(req.params.userId);
    if (targetId === req.user.id) return res.status(400).json({ error: 'Cannot friend yourself' });

    const existing = queryOne(
      'SELECT * FROM friends WHERE (userId1 = ? AND userId2 = ?) OR (userId1 = ? AND userId2 = ?)',
      [req.user.id, targetId, targetId, req.user.id]
    );
    if (existing) {
      return res.status(400).json({ error: 'Friend request already exists' });
    }

    run('INSERT INTO friends (userId1, userId2, status) VALUES (?, ?, ?)', [req.user.id, targetId, 'accepted']);
    run('INSERT INTO notifications (userId, fromUserId, type, referenceId) VALUES (?, ?, ?, ?)', [targetId, req.user.id, 'friend_request', req.user.id]);

    res.json({ success: true, message: 'Friend added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:userId', auth, (req, res) => {
  try {
    const targetId = parseInt(req.params.userId);
    run(
      'DELETE FROM friends WHERE (userId1 = ? AND userId2 = ?) OR (userId1 = ? AND userId2 = ?)',
      [req.user.id, targetId, targetId, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/suggestions', auth, (req, res) => {
  try {
    const users = query(`
      SELECT u.id, u.username, u.firstName, u.lastName, u.avatar, u.status
      FROM users u
      WHERE u.id != ?
      AND u.id NOT IN (
        SELECT CASE WHEN userId1 = ? THEN userId2 ELSE userId1 END
        FROM friends WHERE (userId1 = ? OR userId2 = ?)
      )
      LIMIT 20
    `, [req.user.id, req.user.id, req.user.id, req.user.id]);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
