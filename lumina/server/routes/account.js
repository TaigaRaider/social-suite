import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { run, query, queryOne, saveDB } from '../db.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

router.get('/', auth, async (req, res) => {
  try {
    const user = queryOne('SELECT id, username, email, firstName, lastName, bio, profilePic, coverPic, createdAt FROM users WHERE id = ?', [req.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const postCount = queryOne('SELECT COUNT(*) as count FROM posts WHERE userId = ?', [req.userId]);
    const messageCount = queryOne('SELECT COUNT(*) as count FROM messages WHERE senderId = ?', [req.userId]);

    res.json({
      user,
      stats: {
        posts: postCount.count,
        messages: messageCount.count,
      },
    });
  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/', auth, async (req, res) => {
  try {
    const { firstName, lastName, bio } = req.body;
    run('UPDATE users SET firstName = ?, lastName = ?, bio = ? WHERE id = ?', [firstName, lastName, bio, req.userId]);
    res.json({ message: 'Account updated successfully' });
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/', auth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password confirmation is required' });

    const user = queryOne('SELECT * FROM users WHERE id = ?', [req.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });

    run('DELETE FROM post_hashtags WHERE postId IN (SELECT id FROM posts WHERE userId = ?)', [req.userId]);
    run('DELETE FROM post_views WHERE postId IN (SELECT id FROM posts WHERE userId = ?)', [req.userId]);
    run('DELETE FROM reactions WHERE postId IN (SELECT id FROM posts WHERE userId = ?)', [req.userId]);
    run('DELETE FROM comments WHERE postId IN (SELECT id FROM posts WHERE userId = ?)', [req.userId]);
    run('DELETE FROM likes WHERE postId IN (SELECT id FROM posts WHERE userId = ?)', [req.userId]);
    run('DELETE FROM posts WHERE userId = ?', [req.userId]);

    run('DELETE FROM likes WHERE userId = ?', [req.userId]);
    run('DELETE FROM comments WHERE userId = ?', [req.userId]);
    run('DELETE FROM stories WHERE userId = ?', [req.userId]);
    run('DELETE FROM follows WHERE followerId = ? OR followingId = ?', [req.userId, req.userId]);
    run('DELETE FROM notifications WHERE userId = ? OR relatedUserId = ?', [req.userId, req.userId]);
    run('DELETE FROM blocks WHERE userId = ? OR blockedUserId = ?', [req.userId, req.userId]);
    run('DELETE FROM mutes WHERE userId = ? OR mutedUserId = ?', [req.userId, req.userId]);
    run('DELETE FROM reports WHERE reporterId = ?', [req.userId]);
    run('DELETE FROM two_factor WHERE userId = ?', [req.userId]);
    run('DELETE FROM password_resets WHERE userId = ?', [req.userId]);
    run('DELETE FROM audit_log WHERE userId = ?', [req.userId]);

    run('UPDATE posts SET userId = NULL WHERE userId = ?', [req.userId]);
    run('UPDATE comments SET userId = NULL WHERE userId = ?', [req.userId]);

    run('DELETE FROM users WHERE id = ?', [req.userId]);
    saveDB();

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/export', auth, (req, res) => {
  try {
    const userId = req.userId;
    const user = queryOne('SELECT id, username, email, firstName, lastName, bio, avatar, createdAt FROM users WHERE id = ?', [userId]);

    const posts = query('SELECT * FROM posts WHERE userId = ?', [userId]);
    const likes = query('SELECT * FROM likes WHERE userId = ?', [userId]);
    const comments = query('SELECT * FROM comments WHERE userId = ?', [userId]);
    const stories = query('SELECT * FROM stories WHERE userId = ?', [userId]);
    const followers = query('SELECT * FROM follows WHERE followingId = ?', [userId]);
    const following = query('SELECT * FROM follows WHERE followerId = ?', [userId]);
    const notifications = query('SELECT * FROM notifications WHERE userId = ? OR relatedUserId = ?', [userId, userId]);
    const postViews = query('SELECT * FROM post_views WHERE userId = ?', [userId]);
    const hashtags = query('SELECT * FROM hashtags WHERE userId = ?', [userId]);
    const postHashtags = query('SELECT ph.* FROM post_hashtags ph JOIN posts p ON ph.postId = p.id WHERE p.userId = ?', [userId]);
    const blocks = query('SELECT * FROM blocks WHERE userId = ? OR blockedUserId = ?', [userId, userId]);
    const mutes = query('SELECT * FROM mutes WHERE userId = ? OR mutedUserId = ?', [userId, userId]);
    const reports = query('SELECT * FROM reports WHERE reporterId = ?', [userId]);
    const reactions = query('SELECT * FROM reactions WHERE userId = ?', [userId]);
    const twoFactor = query('SELECT id, userId, enabled, createdAt FROM two_factor WHERE userId = ?', [userId]);
    const auditLog = query('SELECT * FROM audit_log WHERE userId = ?', [userId]);

    const exportData = {
      exportDate: new Date().toISOString(),
      user,
      posts,
      likes,
      comments,
      stories,
      followers,
      following,
      notifications,
      postViews,
      hashtags,
      postHashtags,
      blocks,
      mutes,
      reports,
      reactions,
      twoFactor,
      auditLog,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="social-suite-export-${userId}-${Date.now()}.json"`);
    res.json(exportData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export data' });
  }
});

export default router;