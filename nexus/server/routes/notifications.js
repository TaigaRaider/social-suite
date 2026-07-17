import { Router } from 'express';
import { query, queryOne, run } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.get('/', auth, (req, res) => {
  const notifications = query(`
    SELECT n.*, u.username as fromUsername, u.firstName as fromFirstName, u.lastName as fromLastName, u.avatar as fromAvatar
    FROM notifications n
    LEFT JOIN users u ON n.fromUserId = u.id
    WHERE n.userId = ?
    ORDER BY n.createdAt DESC LIMIT 50
  `, [req.userId]);
  res.json(notifications);
});

router.put('/read', auth, (req, res) => {
  run('UPDATE notifications SET read = 1 WHERE userId = ?', [req.userId]);
  res.json({ success: true });
});

router.get('/unread/count', auth, (req, res) => {
  const result = queryOne('SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND read = 0', [req.userId]);
  res.json({ count: result.count });
});

export default router;
