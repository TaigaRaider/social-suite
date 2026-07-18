import { Router } from 'express';
import { query } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.get('/export', auth, (req, res) => {
  try {
    const profile = query('SELECT id, username, email, firstName, lastName, bio, avatar, createdAt FROM users WHERE id = ?', [req.userId]);
    const posts = query('SELECT * FROM posts WHERE userId = ?', [req.userId]);
    const comments = query('SELECT c.* FROM comments c JOIN posts p ON c.postId = p.id WHERE c.userId = ? OR p.userId = ?', [req.userId, req.userId]);
    const likes = query('SELECT * FROM likes WHERE userId = ?', [req.userId]);
    const follows = query('SELECT * FROM follows WHERE followerId = ? OR followingId = ?', [req.userId, req.userId]);
    const stories = query('SELECT * FROM stories WHERE userId = ?', [req.userId]);
    const notifications = query('SELECT * FROM notifications WHERE userId = ?', [req.userId]);

    res.json({
      profile: profile[0] || null,
      posts,
      comments,
      likes,
      follows,
      stories,
      notifications,
      exportDate: new Date().toISOString(),
      appName: 'Lumina'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
