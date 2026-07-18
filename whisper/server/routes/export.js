import { Router } from 'express';
import { query } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.get('/export', auth, (req, res) => {
  try {
    const profile = query('SELECT id, username, email, firstName, lastName, bio, avatar, createdAt FROM users WHERE id = ?', [req.userId]);
    const posts = query('SELECT * FROM posts WHERE userId = ?', [req.userId]);
    const likes = query('SELECT * FROM likes WHERE userId = ?', [req.userId]);
    const reposts = query('SELECT * FROM reposts WHERE userId = ?', [req.userId]);
    const bookmarks = query('SELECT * FROM bookmarks WHERE userId = ?', [req.userId]);
    const follows = query('SELECT * FROM follows WHERE followerId = ? OR followingId = ?', [req.userId, req.userId]);
    const notifications = query('SELECT * FROM notifications WHERE userId = ?', [req.userId]);

    res.json({
      profile: profile[0] || null,
      posts,
      likes,
      reposts,
      bookmarks,
      follows,
      notifications,
      exportDate: new Date().toISOString(),
      appName: 'Whisper'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
