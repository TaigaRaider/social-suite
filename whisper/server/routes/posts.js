import { Router } from 'express';
import { query, queryOne, run } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.get('/feed', auth, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const offset = (page - 1) * limit;
    const posts = query(`
      SELECT p.*, u.username, u.firstName, u.lastName, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
        (SELECT COUNT(*) FROM reposts WHERE postId = p.id) as repostCount,
        (SELECT COUNT(*) FROM posts WHERE replyToId = p.id) as replyCount,
        (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as liked,
        (SELECT COUNT(*) FROM reposts WHERE postId = p.id AND userId = ?) as reposted,
        (SELECT COUNT(*) FROM bookmarks WHERE postId = p.id AND userId = ?) as bookmarked
      FROM posts p
      JOIN users u ON p.userId = u.id
      WHERE p.replyToId IS NULL AND (p.userId = ? OR p.userId IN (SELECT followingId FROM follows WHERE followerId = ?))
      ORDER BY p.createdAt DESC
      LIMIT ? OFFSET ?
    `, [req.userId, req.userId, req.userId, req.userId, req.userId, limit, offset]);
    res.json(posts.map(p => ({
      ...p, liked: !!p.liked, reposted: !!p.reposted, bookmarked: !!p.bookmarked
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/user/:userId', auth, (req, res) => {
  try {
    const posts = query(`
      SELECT p.*, u.username, u.firstName, u.lastName, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
        (SELECT COUNT(*) FROM reposts WHERE postId = p.id) as repostCount,
        (SELECT COUNT(*) FROM posts WHERE replyToId = p.id) as replyCount,
        (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as liked,
        (SELECT COUNT(*) FROM reposts WHERE postId = p.id AND userId = ?) as reposted,
        (SELECT COUNT(*) FROM bookmarks WHERE postId = p.id AND userId = ?) as bookmarked
      FROM posts p
      JOIN users u ON p.userId = u.id
      WHERE p.userId = ? AND p.replyToId IS NULL
      ORDER BY p.createdAt DESC
    `, [req.userId, req.userId, req.userId, req.params.userId]);
    res.json(posts.map(p => ({
      ...p, liked: !!p.liked, reposted: !!p.reposted, bookmarked: !!p.bookmarked
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/thread/:id', auth, (req, res) => {
  try {
    const post = queryOne(`
      SELECT p.*, u.username, u.firstName, u.lastName, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
        (SELECT COUNT(*) FROM reposts WHERE postId = p.id) as repostCount,
        (SELECT COUNT(*) FROM posts WHERE replyToId = p.id) as replyCount,
        (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as liked,
        (SELECT COUNT(*) FROM reposts WHERE postId = p.id AND userId = ?) as reposted,
        (SELECT COUNT(*) FROM bookmarks WHERE postId = p.id AND userId = ?) as bookmarked
      FROM posts p
      JOIN users u ON p.userId = u.id
      WHERE p.id = ?
    `, [req.userId, req.userId, req.userId, req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    let parent = null;
    if (post.replyToId) {
      parent = queryOne(`
        SELECT p.*, u.username, u.firstName, u.lastName, u.avatar,
          (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
          (SELECT COUNT(*) FROM reposts WHERE postId = p.id) as repostCount,
          (SELECT COUNT(*) FROM posts WHERE replyToId = p.id) as replyCount,
          (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as liked,
          (SELECT COUNT(*) FROM reposts WHERE postId = p.id AND userId = ?) as reposted,
          (SELECT COUNT(*) FROM bookmarks WHERE postId = p.id AND userId = ?) as bookmarked
        FROM posts p
        JOIN users u ON p.userId = u.id
        WHERE p.id = ?
      `, [req.userId, req.userId, req.userId, post.replyToId]);
      if (parent) {
        parent.liked = !!parent.liked;
        parent.reposted = !!parent.reposted;
        parent.bookmarked = !!parent.bookmarked;
      }
    }

    const replies = query(`
      SELECT p.*, u.username, u.firstName, u.lastName, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
        (SELECT COUNT(*) FROM reposts WHERE postId = p.id) as repostCount,
        (SELECT COUNT(*) FROM posts WHERE replyToId = p.id) as replyCount,
        (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as liked,
        (SELECT COUNT(*) FROM reposts WHERE postId = p.id AND userId = ?) as reposted,
        (SELECT COUNT(*) FROM bookmarks WHERE postId = p.id AND userId = ?) as bookmarked
      FROM posts p
      JOIN users u ON p.userId = u.id
      WHERE p.replyToId = ?
      ORDER BY p.createdAt ASC
    `, [req.userId, req.userId, req.userId, req.params.id]);

    post.liked = !!post.liked;
    post.reposted = !!post.reposted;
    post.bookmarked = !!post.bookmarked;

    res.json({
      ...post,
      parent,
      replies: replies.map(r => ({ ...r, liked: !!r.liked, reposted: !!r.reposted, bookmarked: !!r.bookmarked }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, (req, res) => {
  try {
    const { content, replyToId } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Content is required' });
    if (content.length > 500) return res.status(400).json({ error: 'Content must be 500 characters or less' });
    if (replyToId) {
      const parent = queryOne('SELECT id, userId FROM posts WHERE id = ?', [replyToId]);
      if (!parent) return res.status(404).json({ error: 'Parent post not found' });
    }
    const result = run('INSERT INTO posts (userId, content, replyToId) VALUES (?, ?, ?)',
      [req.userId, content.trim(), replyToId || null]);
    const post = queryOne(`
      SELECT p.*, u.username, u.firstName, u.lastName, u.avatar
      FROM posts p JOIN users u ON p.userId = u.id WHERE p.id = ?
    `, [result.lastId]);

    if (replyToId && replyToId !== req.userId) {
      run('INSERT INTO notifications (userId, fromUserId, type, referenceId) VALUES (?, ?, ?, ?)',
        [parent.userId, req.userId, 'reply', result.lastId]);
    }

    res.json({ ...post, likeCount: 0, repostCount: 0, replyCount: 0, liked: false, reposted: false, bookmarked: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', auth, (req, res) => {
  try {
    const post = queryOne('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.userId !== req.userId) return res.status(403).json({ error: 'Not authorized' });
    run('DELETE FROM likes WHERE postId = ?', [req.params.id]);
    run('DELETE FROM reposts WHERE postId = ?', [req.params.id]);
    run('DELETE FROM bookmarks WHERE postId = ?', [req.params.id]);
    run('DELETE FROM notifications WHERE referenceId = ?', [req.params.id]);
    run('DELETE FROM posts WHERE replyToId = ?', [req.params.id]);
    run('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/like', auth, (req, res) => {
  try {
    const post = queryOne('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const existing = queryOne('SELECT id FROM likes WHERE postId = ? AND userId = ?', [req.params.id, req.userId]);
    if (existing) {
      run('DELETE FROM likes WHERE postId = ? AND userId = ?', [req.params.id, req.userId]);
    } else {
      run('INSERT INTO likes (postId, userId) VALUES (?, ?)', [req.params.id, req.userId]);
      if (post.userId !== req.userId) {
        run('INSERT INTO notifications (userId, fromUserId, type, referenceId) VALUES (?, ?, ?, ?)',
          [post.userId, req.userId, 'like', req.params.id]);
      }
    }
    const likeCount = queryOne('SELECT COUNT(*) as count FROM likes WHERE postId = ?', [req.params.id]);
    res.json({ liked: !existing, likeCount: likeCount.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/repost', auth, (req, res) => {
  try {
    const post = queryOne('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const existing = queryOne('SELECT id FROM reposts WHERE postId = ? AND userId = ?', [req.params.id, req.userId]);
    if (existing) {
      run('DELETE FROM reposts WHERE postId = ? AND userId = ?', [req.params.id, req.userId]);
    } else {
      run('INSERT INTO reposts (postId, userId) VALUES (?, ?)', [req.params.id, req.userId]);
      if (post.userId !== req.userId) {
        run('INSERT INTO notifications (userId, fromUserId, type, referenceId) VALUES (?, ?, ?, ?)',
          [post.userId, req.userId, 'repost', req.params.id]);
      }
    }
    const repostCount = queryOne('SELECT COUNT(*) as count FROM reposts WHERE postId = ?', [req.params.id]);
    res.json({ reposted: !existing, repostCount: repostCount.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/bookmark', auth, (req, res) => {
  try {
    const post = queryOne('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const existing = queryOne('SELECT id FROM bookmarks WHERE postId = ? AND userId = ?', [req.params.id, req.userId]);
    if (existing) {
      run('DELETE FROM bookmarks WHERE postId = ? AND userId = ?', [req.params.id, req.userId]);
    } else {
      run('INSERT INTO bookmarks (postId, userId) VALUES (?, ?)', [req.params.id, req.userId]);
    }
    res.json({ bookmarked: !existing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/bookmarks', auth, (req, res) => {
  try {
    const posts = query(`
      SELECT p.*, u.username, u.firstName, u.lastName, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
        (SELECT COUNT(*) FROM reposts WHERE postId = p.id) as repostCount,
        (SELECT COUNT(*) FROM posts WHERE replyToId = p.id) as replyCount,
        (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as liked,
        (SELECT COUNT(*) FROM reposts WHERE postId = p.id AND userId = ?) as reposted,
        1 as bookmarked
      FROM bookmarks b
      JOIN posts p ON b.postId = p.id
      JOIN users u ON p.userId = u.id
      WHERE b.userId = ?
      ORDER BY b.id DESC
    `, [req.userId, req.userId, req.userId]);
    res.json(posts.map(p => ({ ...p, liked: !!p.liked, reposted: !!p.reposted, bookmarked: true })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/trending', auth, (req, res) => {
  try {
    const posts = query(`
      SELECT p.*, u.username, u.firstName, u.lastName, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
        (SELECT COUNT(*) FROM reposts WHERE postId = p.id) as repostCount,
        (SELECT COUNT(*) FROM posts WHERE replyToId = p.id) as replyCount,
        (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as liked,
        (SELECT COUNT(*) FROM reposts WHERE postId = p.id AND userId = ?) as reposted,
        (SELECT COUNT(*) FROM bookmarks WHERE postId = p.id AND userId = ?) as bookmarked
      FROM posts p
      JOIN users u ON p.userId = u.id
      WHERE p.replyToId IS NULL AND p.createdAt >= datetime('now', '-1 day')
      ORDER BY likeCount DESC
      LIMIT 30
    `, [req.userId, req.userId, req.userId]);
    res.json(posts.map(p => ({
      ...p, liked: !!p.liked, reposted: !!p.reposted, bookmarked: !!p.bookmarked
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
