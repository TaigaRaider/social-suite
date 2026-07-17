import { Router } from 'express';
import { query, run } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.get('/', auth, (req, res) => {
  const notifications = query(`
    SELECT n.*, u.username, u.avatar
    FROM notifications n
    JOIN users u ON n.fromUserId = u.id
    WHERE n.userId = ?
    ORDER BY n.createdAt DESC
    LIMIT 50
  `, [req.userId]);
  res.json(notifications);
});

router.put('/read', auth, (req, res) => {
  run('UPDATE notifications SET read = 1 WHERE userId = ?', [req.userId]);
  res.json({ message: 'All notifications marked as read' });
});

router.get('/unread/count', auth, (req, res) => {
  const result = query('SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND read = 0', [req.userId]);
  res.json({ count: result[0].count });
});

export default router;
