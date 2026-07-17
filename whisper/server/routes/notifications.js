import { Router } from 'express';
import { query, queryOne, run } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.get('/', auth, (req, res) => {
  try {
    const notifications = query(`
      SELECT n.*, u.username, u.firstName, u.lastName, u.avatar
      FROM notifications n
      JOIN users u ON n.fromUserId = u.id
      WHERE n.userId = ?
      ORDER BY n.createdAt DESC
      LIMIT 50
    `, [req.userId]);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/read', auth, (req, res) => {
  try {
    run('UPDATE notifications SET read = 1 WHERE userId = ?', [req.userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/unread/count', auth, (req, res) => {
  try {
    const result = queryOne('SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND read = 0', [req.userId]);
    res.json({ count: result.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
