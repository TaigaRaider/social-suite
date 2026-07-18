import { Router } from 'express';
import { query } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.get('/export', auth, (req, res) => {
  try {
    const profile = query('SELECT id, username, email, firstName, lastName, bio, avatar, coverPhoto, createdAt FROM users WHERE id = ?', [req.userId]);
    const posts = query('SELECT * FROM posts WHERE userId = ?', [req.userId]);
    const comments = query('SELECT c.* FROM comments c JOIN posts p ON c.postId = p.id WHERE c.userId = ? OR p.userId = ?', [req.userId, req.userId]);
    const likes = query('SELECT * FROM likes WHERE userId = ?', [req.userId]);
    const friends = query("SELECT f.*, u1.username as requesterName, u2.username as addresseeName FROM friendships f JOIN users u1 ON f.requesterId = u1.id JOIN users u2 ON f.addresseeId = u2.id WHERE f.requesterId = ? OR f.addresseeId = ?", [req.userId, req.userId]);
    const messages = query('SELECT * FROM messages WHERE senderId = ? OR receiverId = ?', [req.userId, req.userId]);
    const notifications = query('SELECT * FROM notifications WHERE userId = ?', [req.userId]);

    res.json({
      profile: profile[0] || null,
      posts,
      comments,
      likes,
      friends,
      messages,
      notifications,
      exportDate: new Date().toISOString(),
      appName: 'Nexus'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
