import { Router } from 'express';
import { run, query, queryOne } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

const adminOnly = (req, res, next) => {
  const user = queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

router.get('/reports', auth, adminOnly, (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT r.*, u.username as reporterUsername
      FROM reports r
      JOIN users u ON r.reporterId = u.id
    `;
    const params = [];
    if (status) {
      sql += ' WHERE r.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY r.createdAt DESC';
    const reports = query(sql, params);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/reports/:id', auth, adminOnly, (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Status must be reviewed, resolved, or dismissed' });
    }
    const report = queryOne('SELECT * FROM reports WHERE id = ?', [parseInt(req.params.id)]);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    run('UPDATE reports SET status = ?, reviewedBy = ? WHERE id = ?', [status, req.user.id, parseInt(req.params.id)]);
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', auth, adminOnly, (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const users = query('SELECT id, username, email, firstName, lastName, role, lockedUntil, createdAt FROM users ORDER BY createdAt DESC LIMIT ? OFFSET ?', [limit, offset]);
    const total = queryOne('SELECT COUNT(*) as count FROM users').count;
    res.json({ users, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/ban', auth, adminOnly, (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = queryOne('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      run('UPDATE users SET lockedUntil = NULL WHERE id = ?', [userId]);
      return res.json({ success: true, banned: false, message: 'User unbanned' });
    }
    const lockUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    run('UPDATE users SET lockedUntil = ? WHERE id = ?', [lockUntil, userId]);
    res.json({ success: true, banned: true, lockedUntil: lockUntil });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/posts/:id', auth, adminOnly, (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const post = queryOne('SELECT * FROM posts WHERE id = ?', [postId]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    run('DELETE FROM post_hashtags WHERE postId = ?', [postId]);
    run('DELETE FROM post_views WHERE postId = ?', [postId]);
    run('DELETE FROM comments WHERE postId = ?', [postId]);
    run('DELETE FROM likes WHERE postId = ?', [postId]);
    run('DELETE FROM posts WHERE id = ?', [postId]);
    res.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', auth, adminOnly, (req, res) => {
  try {
    const totalUsers = queryOne('SELECT COUNT(*) as count FROM users').count;
    const totalPosts = queryOne('SELECT COUNT(*) as count FROM posts').count;
    const pendingReports = queryOne("SELECT COUNT(*) as count FROM reports WHERE status = 'pending'").count;
    const today = new Date().toISOString().split('T')[0];
    const postsToday = queryOne("SELECT COUNT(*) as count FROM posts WHERE DATE(createdAt) = ?", [today]).count;
    res.json({ totalUsers, totalPosts, pendingReports, postsToday });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
