import { Router } from 'express';
import { query } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.get('/export', auth, (req, res) => {
  try {
    const profile = query('SELECT id, username, email, firstName, lastName, bio, avatar, status, createdAt FROM users WHERE id = ?', [req.userId]);
    const conversations = query('SELECT c.* FROM conversations c JOIN conversation_members cm ON c.id = cm.conversationId WHERE cm.userId = ?', [req.userId]);
    const messages = query('SELECT * FROM messages WHERE senderId = ? OR conversationId IN (SELECT conversationId FROM conversation_members WHERE userId = ?)', [req.userId, req.userId]);
    const friends = query('SELECT * FROM friends WHERE userId1 = ? OR userId2 = ?', [req.userId, req.userId]);
    const notifications = query('SELECT * FROM notifications WHERE userId = ?', [req.userId]);

    res.json({
      profile: profile[0] || null,
      conversations,
      messages,
      friends,
      notifications,
      exportDate: new Date().toISOString(),
      appName: 'Pulse'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
