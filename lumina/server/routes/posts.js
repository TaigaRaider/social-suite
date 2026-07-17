import { Router } from 'express';
import { query, queryOne, run } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.get('/feed', auth, (req, res) => {
  const posts = query(`
    SELECT p.*, u.username, u.avatar,
      (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
      (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentCount,
      (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as isLiked
    FROM posts p
    JOIN users u ON p.userId = u.id
    WHERE p.userId = ? OR p.userId IN (SELECT followingId FROM follows WHERE followerId = ?)
    ORDER BY p.createdAt DESC
    LIMIT 50
  `, [req.userId, req.userId, req.userId]);
  res.json(posts);
});

router.get('/user/:userId', auth, (req, res) => {
  const posts = query(`
    SELECT p.*, u.username, u.avatar,
      (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
      (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentCount,
      (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as isLiked
    FROM posts p
    JOIN users u ON p.userId = u.id
    WHERE p.userId = ?
    ORDER BY p.createdAt DESC
  `, [req.userId, req.params.userId]);
  res.json(posts);
});

router.post('/', auth, (req, res) => {
  const { image, caption } = req.body;
  if (!image) return res.status(400).json({ error: 'Image URL is required' });

  const result = run('INSERT INTO posts (userId, image, caption) VALUES (?, ?, ?)', [req.userId, image, caption || '']);
  const post = queryOne('SELECT * FROM posts WHERE id = ?', [result.lastId]);
  const user = queryOne('SELECT username, avatar FROM users WHERE id = ?', [req.userId]);
  res.json({ ...post, username: user.username, avatar: user.avatar, likeCount: 0, commentCount: 0, isLiked: 0 });
});

router.delete('/:id', auth, (req, res) => {
  const post = queryOne('SELECT * FROM posts WHERE id = ?', [req.params.id]);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.userId !== req.userId) return res.status(403).json({ error: 'Not authorized' });

  run('DELETE FROM comments WHERE postId = ?', [req.params.id]);
  run('DELETE FROM likes WHERE postId = ?', [req.params.id]);
  run('DELETE FROM posts WHERE id = ?', [req.params.id]);
  res.json({ message: 'Post deleted' });
});

router.post('/:id/like', auth, (req, res) => {
  const post = queryOne('SELECT * FROM posts WHERE id = ?', [req.params.id]);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const existing = queryOne('SELECT id FROM likes WHERE postId = ? AND userId = ?', [req.params.id, req.userId]);
  if (existing) {
    run('DELETE FROM likes WHERE postId = ? AND userId = ?', [req.params.id, req.userId]);
  } else {
    run('INSERT INTO likes (postId, userId) VALUES (?, ?)', [req.params.id, req.userId]);
    if (post.userId !== req.userId) {
      run(
        'INSERT INTO notifications (userId, fromUserId, type, referenceId) VALUES (?, ?, ?, ?)',
        [post.userId, req.userId, 'like', parseInt(req.params.id)]
      );
    }
  }

  const likeCount = queryOne('SELECT COUNT(*) as count FROM likes WHERE postId = ?', [req.params.id]);
  res.json({ liked: !existing, likeCount: likeCount.count });
});

router.get('/explore', auth, (req, res) => {
  const posts = query(`
    SELECT p.*, u.username, u.avatar,
      (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
      (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentCount,
      (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as isLiked
    FROM posts p
    JOIN users u ON p.userId = u.id
    ORDER BY RANDOM()
    LIMIT 30
  `, [req.userId]);
  res.json(posts);
});

router.get('/:id/comments', auth, (req, res) => {
  const comments = query(`
    SELECT c.*, u.username, u.avatar
    FROM comments c
    JOIN users u ON c.userId = u.id
    WHERE c.postId = ?
    ORDER BY c.createdAt ASC
  `, [req.params.id]);
  res.json(comments);
});

router.post('/:id/comments', auth, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });

  const post = queryOne('SELECT * FROM posts WHERE id = ?', [req.params.id]);
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const result = run('INSERT INTO comments (postId, userId, content) VALUES (?, ?, ?)', [req.params.id, req.userId, content]);
  const comment = queryOne('SELECT c.*, u.username, u.avatar FROM comments c JOIN users u ON c.userId = u.id WHERE c.id = ?', [result.lastId]);

  if (post.userId !== req.userId) {
    run(
      'INSERT INTO notifications (userId, fromUserId, type, referenceId) VALUES (?, ?, ?, ?)',
      [post.userId, req.userId, 'comment', parseInt(req.params.id)]
    );
  }

  res.json(comment);
});

export default router;
