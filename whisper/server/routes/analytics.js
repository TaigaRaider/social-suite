import { Router } from 'express';
import { query, queryOne, run } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.post('/view', auth, (req, res) => {
  const { postId } = req.body;
  if (!postId) return res.status(400).json({ error: 'postId is required' });
  const existing = queryOne('SELECT id FROM post_views WHERE postId = ? AND userId = ? AND viewedAt > datetime("now", "-1 hour")', [postId, req.userId]);
  if (!existing) run('INSERT INTO post_views (postId, userId) VALUES (?, ?)', [postId, req.userId]);
  res.json({ ok: true });
});

router.get('/post/:postId', auth, (req, res) => {
  const stats = queryOne(`
    SELECT 
      (SELECT COUNT(*) FROM post_views WHERE postId = ?) as views,
      (SELECT COUNT(*) FROM likes WHERE postId = ?) as likes,
      (SELECT COUNT(*) FROM reposts WHERE postId = ?) as reposts,
      (SELECT COUNT(*) FROM comments WHERE postId = ?) as comments,
      (SELECT COUNT(DISTINCT userId) FROM post_views WHERE postId = ?) as uniqueViewers
    `, [req.params.postId, req.params.postId, req.params.postId, req.params.postId, req.params.postId]);
  res.json(stats);
});

router.get('/my-posts', auth, (req, res) => {
  const posts = query(`
    SELECT p.id, p.content, p.createdAt,
      (SELECT COUNT(*) FROM post_views WHERE postId = p.id) as views,
      (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likes,
      (SELECT COUNT(*) FROM reposts WHERE postId = p.id) as reposts,
      (SELECT COUNT(*) FROM comments WHERE postId = p.id) as comments
    FROM posts p WHERE p.userId = ?
    ORDER BY p.createdAt DESC LIMIT 20
  `, [req.userId]);
  const totalStats = queryOne(`
    SELECT 
      (SELECT COUNT(*) FROM posts WHERE userId = ?) as totalPosts,
      (SELECT COUNT(*) FROM post_views pv JOIN posts p ON pv.postId = p.id WHERE p.userId = ?) as totalViews,
      (SELECT COUNT(*) FROM likes l JOIN posts p ON l.postId = p.id WHERE p.userId = ?) as totalLikes,
      (SELECT COUNT(*) FROM reposts r JOIN posts p ON r.postId = p.id WHERE p.userId = ?) as totalReposts
  `, [req.userId, req.userId, req.userId, req.userId]);
  res.json({ posts, stats: totalStats });
});

export default router;
