import { Router } from 'express';
import { query, queryOne, run } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.get('/', auth, (req, res) => {
  const { q, type = 'all' } = req.query;
  if (!q || !q.trim()) return res.json({ users: [], posts: [], hashtags: [] });

  const term = `%${q.trim()}%`;
  const results = {};

  if (type === 'all' || type === 'users') {
    results.users = query(`
      SELECT id, username, firstName, lastName, avatar, bio
      FROM users
      WHERE username LIKE ? OR firstName LIKE ? OR lastName LIKE ?
      LIMIT 10
    `, [term, term, term]);
  }

  if (type === 'all' || type === 'posts') {
    results.posts = query(`
      SELECT p.*, u.username, u.firstName, u.lastName, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
        (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentCount
      FROM posts p JOIN users u ON p.userId = u.id
      WHERE (p.content LIKE ? OR p.image LIKE ?)
        AND (p.scheduledAt IS NULL OR p.scheduledAt <= datetime('now'))
      ORDER BY p.createdAt DESC LIMIT 20
    `, [term, term]);
  }

  if (type === 'all' || type === 'hashtags') {
    results.hashtags = query(`
      SELECT h.tag, COUNT(ph.postId) as count
      FROM hashtags h
      JOIN post_hashtags ph ON h.tag = ph.tag
      WHERE h.tag LIKE ?
      GROUP BY h.tag
      ORDER BY count DESC LIMIT 10
    `, [term]);
  }

  res.json(results);
});

export default router;
