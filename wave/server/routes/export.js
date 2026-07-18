import { Router } from 'express';
import { query } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.get('/export', auth, (req, res) => {
  try {
    const userId = req.user.id;
    const profile = query('SELECT id, username, email, firstName, lastName, bio, avatar, status, createdAt FROM users WHERE id = ?', [userId]);
    const groups = query('SELECT g.* FROM groups g JOIN group_members gm ON g.id = gm.groupId WHERE gm.userId = ?', [userId]);
    const messages = query('SELECT * FROM messages WHERE senderId = ? OR groupId IN (SELECT groupId FROM group_members WHERE userId = ?)', [userId, userId]);
    const friends = query('SELECT * FROM friends WHERE userId1 = ? OR userId2 = ?', [userId, userId]);
    const notifications = query('SELECT * FROM notifications WHERE userId = ?', [userId]);

    res.json({
      profile: profile[0] || null,
      groups,
      messages,
      friends,
      notifications,
      exportDate: new Date().toISOString(),
      appName: 'Wave'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
