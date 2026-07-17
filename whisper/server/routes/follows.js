import { Router } from 'express';
import { query, queryOne, run } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.post('/:userId', auth, (req, res) => {
  try {
    const targetId = parseInt(req.params.userId);
    if (targetId === req.userId) return res.status(400).json({ error: 'Cannot follow yourself' });
    const target = queryOne('SELECT id FROM users WHERE id = ?', [targetId]);
    if (!target) return res.status(404).json({ error: 'User not found' });
    const existing = queryOne('SELECT id FROM follows WHERE followerId = ? AND followingId = ?', [req.userId, targetId]);
    if (existing) {
      run('DELETE FROM follows WHERE followerId = ? AND followingId = ?', [req.userId, targetId]);
      res.json({ following: false });
    } else {
      run('INSERT INTO follows (followerId, followingId) VALUES (?, ?)', [req.userId, targetId]);
      run('INSERT INTO notifications (userId, fromUserId, type, referenceId) VALUES (?, ?, ?, ?)',
        [targetId, req.userId, 'follow', req.userId]);
      res.json({ following: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/followers/:userId', auth, (req, res) => {
  try {
    const followers = query(`
      SELECT u.id, u.username, u.firstName, u.lastName, u.avatar, u.bio,
        CASE WHEN f2.id IS NOT NULL THEN 1 ELSE 0 END as isFollowing
      FROM follows f
      JOIN users u ON f.followerId = u.id
      LEFT JOIN follows f2 ON f2.followerId = ? AND f2.followingId = u.id
      WHERE f.followingId = ?
      ORDER BY f.id DESC
    `, [req.userId, req.params.userId]);
    res.json(followers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/following/:userId', auth, (req, res) => {
  try {
    const following = query(`
      SELECT u.id, u.username, u.firstName, u.lastName, u.avatar, u.bio,
        CASE WHEN f2.id IS NOT NULL THEN 1 ELSE 0 END as isFollowing
      FROM follows f
      JOIN users u ON f.followingId = u.id
      LEFT JOIN follows f2 ON f2.followerId = ? AND f2.followingId = u.id
      WHERE f.followerId = ?
      ORDER BY f.id DESC
    `, [req.userId, req.params.userId]);
    res.json(following);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/suggestions', auth, (req, res) => {
  try {
    const suggestions = query(`
      SELECT u.id, u.username, u.firstName, u.lastName, u.avatar, u.bio
      FROM users u
      WHERE u.id != ? AND u.id NOT IN (SELECT followingId FROM follows WHERE followerId = ?)
      ORDER BY RANDOM()
      LIMIT 5
    `, [req.userId, req.userId]);
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
