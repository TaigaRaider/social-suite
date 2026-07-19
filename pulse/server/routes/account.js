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

    const postCount = queryOne('SELECT COUNT(*) as count FROM conversations WHERE creatorId = ?', [req.userId]);
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

    run('DELETE FROM conversation_members WHERE userId = ?', [req.userId]);
    run('DELETE FROM conversations WHERE id NOT IN (SELECT DISTINCT conversationId FROM conversation_members)');

    run('DELETE FROM messages WHERE senderId = ?', [req.userId]);
    run('DELETE FROM friends WHERE userId = ? OR friendId = ?', [req.userId, req.userId]);
    run('DELETE FROM notifications WHERE userId = ? OR relatedUserId = ?', [req.userId, req.userId]);
    run('DELETE FROM typing WHERE userId = ?', [req.userId]);
    run('DELETE FROM reactions WHERE userId = ?', [req.userId]);
    run('DELETE FROM two_factor WHERE userId = ?', [req.userId]);
    run('DELETE FROM password_resets WHERE userId = ?', [req.userId]);
    run('DELETE FROM audit_log WHERE userId = ?', [req.userId]);

    run('UPDATE messages SET senderId = NULL WHERE senderId = ?', [req.userId]);

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

    const conversations = query('SELECT c.* FROM conversations c JOIN conversation_members cm ON c.id = cm.conversationId WHERE cm.userId = ?', [userId]);
    const messages = query('SELECT * FROM messages WHERE senderId = ?', [userId]);
    const friends = query('SELECT * FROM friends WHERE userId = ? OR friendId = ?', [userId, userId]);
    const notifications = query('SELECT * FROM notifications WHERE userId = ? OR relatedUserId = ?', [userId, userId]);
    const typing = query('SELECT * FROM typing WHERE userId = ?', [userId]);
    const reactions = query('SELECT * FROM reactions WHERE userId = ?', [userId]);
    const twoFactor = query('SELECT id, userId, enabled, createdAt FROM two_factor WHERE userId = ?', [userId]);
    const auditLog = query('SELECT * FROM audit_log WHERE userId = ?', [userId]);

    const exportData = {
      exportDate: new Date().toISOString(),
      user,
      conversations,
      messages,
      friends,
      notifications,
      typing,
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