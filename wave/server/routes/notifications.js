import { Router } from 'express';
import { auth } from '../auth.js';
import { query, queryOne, run } from '../db.js';

const router = Router();

router.get('/', auth, (req, res) => {
  try {
    const notifications = query(`
      SELECT n.*, u.username as fromUsername, u.firstName as fromFirstName, u.lastName as fromLastName, u.avatar as fromAvatar
      FROM notifications n
      LEFT JOIN users u ON n.fromUserId = u.id
      WHERE n.userId = ?
      ORDER BY n.createdAt DESC
      LIMIT 50
    `, [req.user.id]);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/unread/count', auth, (req, res) => {
  try {
    const result = queryOne('SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND read = 0', [req.user.id]);
    res.json({ count: result ? result.count : 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/read', auth, (req, res) => {
  try {
    run('UPDATE notifications SET read = 1 WHERE userId = ?', [req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
