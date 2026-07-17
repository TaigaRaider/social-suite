import { Router } from 'express';
import { query, queryOne, run } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.get('/feed', auth, (req, res) => {
  const friends = query("SELECT CASE WHEN requesterId = ? THEN addresseeId ELSE requesterId END as friendId FROM friendships WHERE (requesterId = ? OR addresseeId = ?) AND status = 'accepted'", [req.userId, req.userId, req.userId]);
  const friendIds = friends.map(f => f.friendId);
  friendIds.push(req.userId);
  const placeholders = friendIds.map(() => '?').join(',');
  const posts = query(`
    SELECT p.*, u.username, u.firstName, u.lastName, u.avatar,
      (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
      (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentCount,
      (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as userLiked
    FROM posts p JOIN users u ON p.userId = u.id
    WHERE p.userId IN (${placeholders})
    ORDER BY p.createdAt DESC LIMIT 50
  `, [req.userId, ...friendIds]);
  res.json(posts);
});

router.get('/user/:userId', auth, (req, res) => {
  const posts = query(`
    SELECT p.*, u.username, u.firstName, u.lastName, u.avatar,
      (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
      (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentCount,
      (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as userLiked
    FROM posts p JOIN users u ON p.userId = u.id
    WHERE p.userId = ?
    ORDER BY p.createdAt DESC LIMIT 50
  `, [req.userId, req.params.userId]);
  res.json(posts);
});

router.post('/', auth, (req, res) => {
  const { content, image } = req.body;
  if (!content && !image) return res.status(400).json({ error: 'Post must have content or image' });
  const result = run('INSERT INTO posts (userId, content, image) VALUES (?, ?, ?)', [req.userId, content || '', image || '']);
  const post = queryOne(`
    SELECT p.*, u.username, u.firstName, u.lastName, u.avatar,
      0 as likeCount, 0 as commentCount, 0 as userLiked
    FROM posts p JOIN users u ON p.userId = u.id WHERE p.id = ?
  `, [result.lastInsertRowid]);
  res.json(post);
});

router.delete('/:id', auth, (req, res) => {
  run('DELETE FROM posts WHERE id = ? AND userId = ?', [req.params.id, req.userId]);
  res.json({ success: true });
});

router.post('/:id/like', auth, (req, res) => {
  const existing = queryOne('SELECT id FROM likes WHERE postId = ? AND userId = ?', [req.params.id, req.userId]);
  if (existing) {
    run('DELETE FROM likes WHERE postId = ? AND userId = ?', [req.params.id, req.userId]);
  } else {
    run('INSERT INTO likes (postId, userId) VALUES (?, ?)', [req.params.id, req.userId]);
    const post = queryOne('SELECT userId FROM posts WHERE id = ?', [req.params.id]);
    if (post && post.userId !== req.userId) {
      run('INSERT INTO notifications (userId, fromUserId, type, referenceId) VALUES (?, ?, ?, ?)', [post.userId, req.userId, 'like', req.params.id]);
    }
  }
  const count = queryOne('SELECT COUNT(*) as count FROM likes WHERE postId = ?', [req.params.id]).count;
  const liked = queryOne('SELECT id FROM likes WHERE postId = ? AND userId = ?', [req.params.id, req.userId]);
  res.json({ likeCount: count, userLiked: !!liked });
});

router.get('/:id/comments', auth, (req, res) => {
  const comments = query(`
    SELECT c.*, u.username, u.firstName, u.lastName, u.avatar
    FROM comments c JOIN users u ON c.userId = u.id
    WHERE c.postId = ? ORDER BY c.createdAt ASC
  `, [req.params.id]);
  res.json(comments);
});

router.post('/:id/comments', auth, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Comment content required' });
  const result = run('INSERT INTO comments (postId, userId, content) VALUES (?, ?, ?)', [req.params.id, req.userId, content]);
  const post = queryOne('SELECT userId FROM posts WHERE id = ?', [req.params.id]);
  if (post && post.userId !== req.userId) {
    run('INSERT INTO notifications (userId, fromUserId, type, referenceId) VALUES (?, ?, ?, ?)', [post.userId, req.userId, 'comment', req.params.id]);
  }
  const comment = queryOne('SELECT c.*, u.username, u.firstName, u.lastName, u.avatar FROM comments c JOIN users u ON c.userId = u.id WHERE c.id = ?', [result.lastInsertRowid]);
  res.json(comment);
});

export default router;
