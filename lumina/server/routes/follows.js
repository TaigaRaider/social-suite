import { Router } from 'express';
import { query, queryOne, run } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.get('/followers/:userId', auth, (req, res) => {
  const followers = query(`
    SELECT u.id, u.username, u.firstName, u.lastName, u.avatar
    FROM follows f
    JOIN users u ON f.followerId = u.id
    WHERE f.followingId = ?
  `, [req.params.userId]);
  res.json(followers);
});

router.get('/following/:userId', auth, (req, res) => {
  const following = query(`
    SELECT u.id, u.username, u.firstName, u.lastName, u.avatar
    FROM follows f
    JOIN users u ON f.followingId = u.id
    WHERE f.followerId = ?
  `, [req.params.userId]);
  res.json(following);
});

router.post('/:userId', auth, (req, res) => {
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
    run(
      'INSERT INTO notifications (userId, fromUserId, type, referenceId) VALUES (?, ?, ?, ?)',
      [targetId, req.userId, 'follow', targetId]
    );
    res.json({ following: true });
  }
});

router.get('/suggestions', auth, (req, res) => {
  const suggestions = query(`
    SELECT u.id, u.username, u.firstName, u.lastName, u.avatar
    FROM users u
    WHERE u.id != ? AND u.id NOT IN (SELECT followingId FROM follows WHERE followerId = ?)
    ORDER BY RANDOM()
    LIMIT 10
  `, [req.userId, req.userId]);
  res.json(suggestions);
});

export default router;
