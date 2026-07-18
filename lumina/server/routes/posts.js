import { Router } from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { query, queryOne, run } from '../db.js';
import { auth } from '../auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

import crypto from 'crypto';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp'
};

const storage = multer.diskStorage({
  destination: join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const safeExt = MIME_TO_EXT[file.mimetype] || 'bin';
    cb(null, `${Date.now()}-${crypto.randomBytes(16).toString('hex')}.${safeExt}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      return cb(new Error('File type not allowed'), false);
    }
    cb(null, true);
  }
});

const router = Router();

router.post('/upload', auth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

router.get('/scheduled', auth, (req, res) => {
  const posts = query(`
    SELECT p.*, u.username, u.avatar,
      (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
      (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentCount,
      0 as isLiked
    FROM posts p
    JOIN users u ON p.userId = u.id
    WHERE p.userId = ? AND p.scheduledAt IS NOT NULL AND p.scheduledAt > datetime('now')
    ORDER BY p.scheduledAt ASC
  `, [req.userId]);
  res.json(posts);
});

router.delete('/scheduled/:id', auth, (req, res) => {
  run('DELETE FROM posts WHERE id = ? AND userId = ? AND scheduledAt IS NOT NULL', [req.params.id, req.userId]);
  res.json({ success: true });
});

router.get('/feed', auth, (req, res) => {
  const ranked = req.query.ranked !== 'false';

  if (ranked) {
    const posts = query(`
      SELECT p.*, u.username, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
        (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentCount,
        (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as isLiked,
        (SELECT COUNT(*) FROM post_views WHERE postId = p.id) as viewCount,
        (
          (SELECT COUNT(*) FROM likes WHERE postId = p.id) * 2 +
          (SELECT COUNT(*) FROM comments WHERE postId = p.id) * 3 +
          (SELECT COUNT(*) FROM post_views WHERE postId = p.id) * 0.5
        ) as engagementScore,
        CAST((julianday('now') - julianday(p.createdAt)) * 24 AS INTEGER) as hoursOld
      FROM posts p
      JOIN users u ON p.userId = u.id
      WHERE (p.userId = ? OR p.userId IN (SELECT followingId FROM follows WHERE followerId = ?))
      AND (p.scheduledAt IS NULL OR p.scheduledAt <= datetime('now'))
      ORDER BY 
        (engagementScore / (1 + hoursOld * 0.1)) DESC,
        p.createdAt DESC
      LIMIT 50
    `, [req.userId, req.userId, req.userId]);
    res.json(posts);
  } else {
    const posts = query(`
      SELECT p.*, u.username, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
        (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentCount,
        (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as isLiked
      FROM posts p
      JOIN users u ON p.userId = u.id
      WHERE (p.userId = ? OR p.userId IN (SELECT followingId FROM follows WHERE followerId = ?))
      AND (p.scheduledAt IS NULL OR p.scheduledAt <= datetime('now'))
      ORDER BY p.createdAt DESC
      LIMIT 50
    `, [req.userId, req.userId, req.userId]);
    res.json(posts);
  }
});

router.get('/user/:userId', auth, (req, res) => {
  const posts = query(`
    SELECT p.*, u.username, u.avatar,
      (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
      (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentCount,
      (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as isLiked
    FROM posts p
    JOIN users u ON p.userId = u.id
    WHERE p.userId = ? AND (p.scheduledAt IS NULL OR p.scheduledAt <= datetime('now'))
    ORDER BY p.createdAt DESC
  `, [req.userId, req.params.userId]);
  res.json(posts);
});

router.post('/', auth, (req, res) => {
  const { image, caption, scheduledAt } = req.body;
  if (!image) return res.status(400).json({ error: 'Image URL is required' });

  const result = run('INSERT INTO posts (userId, image, caption, scheduledAt) VALUES (?, ?, ?, ?)', [req.userId, image, caption || '', scheduledAt || null]);
  const postId = result.lastId;

  if (caption) {
    const tags = caption.match(/#[\w\u0400-\u04FF\u4e00-\u9fff]+/gi);
    if (tags) {
      const uniqueTags = [...new Set(tags.map(t => t.toLowerCase()))];
      for (const tag of uniqueTags) {
        run('INSERT OR IGNORE INTO hashtags (tag) VALUES (?)', [tag]);
        run('INSERT OR IGNORE INTO post_hashtags (postId, tag) VALUES (?, ?)', [postId, tag]);
      }
    }
  }

  const post = queryOne('SELECT * FROM posts WHERE id = ?', [postId]);
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
    WHERE (p.scheduledAt IS NULL OR p.scheduledAt <= datetime('now'))
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
