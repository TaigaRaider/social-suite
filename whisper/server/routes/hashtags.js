import { Router } from 'express';
import { query, queryOne, run } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.get('/trending', auth, (req, res) => {
  const trending = query(`
    SELECT h.tag, COUNT(ph.postId) as postCount,
      (SELECT COUNT(DISTINCT ph2.postId) FROM post_hashtags ph2 
       JOIN posts p2 ON ph2.postId = p2.id 
       WHERE ph2.tag = h.tag AND p2.createdAt > datetime('now', '-7 days')) as weekCount
    FROM hashtags h JOIN post_hashtags ph ON h.tag = ph.tag
    JOIN posts p ON ph.postId = p.id
    WHERE p.createdAt > datetime('now', '-30 days')
    GROUP BY h.tag ORDER BY weekCount DESC LIMIT 20
  `);
  res.json(trending);
});

router.get('/search/:tag', auth, (req, res) => {
  const tag = req.params.tag.toLowerCase();
  const posts = query(`
    SELECT p.*, u.username, u.firstName, u.lastName, u.avatar,
      (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
      (SELECT COUNT(*) FROM reposts WHERE postId = p.id) as repostCount
    FROM posts p JOIN users u ON p.userId = u.id
    JOIN post_hashtags ph ON p.id = ph.postId
    WHERE ph.tag = ? ORDER BY p.createdAt DESC LIMIT 50
  `, [req.userId, tag]);
  const info = queryOne('SELECT tag, COUNT(*) as count FROM post_hashtags WHERE tag = ? GROUP BY tag', [tag]);
  res.json({ tag, posts, postCount: info ? info.count : 0 });
});

router.get('/suggest', auth, (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  const tags = query('SELECT tag, COUNT(*) as count FROM post_hashtags WHERE tag LIKE ? GROUP BY tag ORDER BY count DESC LIMIT 10', [`%${q.toLowerCase()}%`]);
  res.json(tags);
});

export default router;
