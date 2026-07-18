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
    SELECT p.*, u.username, u.firstName, u.lastName, u.avatar,
      (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
      (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentCount,
      0 as userLiked
    FROM posts p JOIN users u ON p.userId = u.id
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
  const friends = query("SELECT CASE WHEN requesterId = ? THEN addresseeId ELSE requesterId END as friendId FROM friendships WHERE (requesterId = ? OR addresseeId = ?) AND status = 'accepted'", [req.userId, req.userId, req.userId]);
  const friendIds = friends.map(f => f.friendId);
  friendIds.push(req.userId);
  const placeholders = friendIds.map(() => '?').join(',');

  if (ranked) {
    const posts = query(`
      SELECT p.*, u.username, u.firstName, u.lastName, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
        (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentCount,
        (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as userLiked,
        (SELECT COUNT(*) FROM post_views WHERE postId = p.id) as viewCount,
        CASE WHEN EXISTS(SELECT 1 FROM polls WHERE postId = p.id) THEN 1 ELSE 0 END as hasPoll,
        (
          (SELECT COUNT(*) FROM likes WHERE postId = p.id) * 2 +
          (SELECT COUNT(*) FROM comments WHERE postId = p.id) * 3 +
          (SELECT COUNT(*) FROM post_views WHERE postId = p.id) * 0.5
        ) as engagementScore,
        CAST((julianday('now') - julianday(p.createdAt)) * 24 AS INTEGER) as hoursOld
    FROM posts p JOIN users u ON p.userId = u.id
    WHERE p.userId IN (${placeholders}) AND (p.scheduledAt IS NULL OR p.scheduledAt <= datetime('now'))
    ORDER BY 
      (engagementScore / (1 + hoursOld * 0.1)) DESC,
      p.createdAt DESC
    LIMIT 50
    `, [req.userId, ...friendIds]);
    res.json(posts);
  } else {
    const posts = query(`
      SELECT p.*, u.username, u.firstName, u.lastName, u.avatar,
        (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
        (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentCount,
        (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as userLiked,
        CASE WHEN EXISTS(SELECT 1 FROM polls WHERE postId = p.id) THEN 1 ELSE 0 END as hasPoll
      FROM posts p JOIN users u ON p.userId = u.id
      WHERE p.userId IN (${placeholders}) AND (p.scheduledAt IS NULL OR p.scheduledAt <= datetime('now'))
      ORDER BY p.createdAt DESC LIMIT 50
    `, [req.userId, ...friendIds]);
    res.json(posts);
  }
});

router.get('/user/:userId', auth, (req, res) => {
  const posts = query(`
    SELECT p.*, u.username, u.firstName, u.lastName, u.avatar,
      (SELECT COUNT(*) FROM likes WHERE postId = p.id) as likeCount,
      (SELECT COUNT(*) FROM comments WHERE postId = p.id) as commentCount,
      (SELECT COUNT(*) FROM likes WHERE postId = p.id AND userId = ?) as userLiked,
      CASE WHEN EXISTS(SELECT 1 FROM polls WHERE postId = p.id) THEN 1 ELSE 0 END as hasPoll
    FROM posts p JOIN users u ON p.userId = u.id
    WHERE p.userId = ? AND (p.scheduledAt IS NULL OR p.scheduledAt <= datetime('now'))
    ORDER BY p.createdAt DESC LIMIT 50
  `, [req.userId, req.params.userId]);
  res.json(posts);
});

router.post('/', auth, (req, res) => {
  const { content, image, scheduledAt, poll } = req.body;
  if (!content && !image && !poll) return res.status(400).json({ error: 'Post must have content, image, or poll' });
  const result = run('INSERT INTO posts (userId, content, image, scheduledAt) VALUES (?, ?, ?, ?)', [req.userId, content || '', image || '', scheduledAt || null]);
  const postId = result.lastInsertRowid;

  if (poll && poll.question && poll.options && poll.options.length >= 2) {
    const pollResult = run('INSERT INTO polls (postId, question, expiresAt) VALUES (?, ?, ?)', [postId, poll.question, poll.expiresAt || null]);
    for (const option of poll.options.slice(0, 4)) {
      run('INSERT INTO poll_options (pollId, text) VALUES (?, ?)', [pollResult.lastInsertRowid, option]);
    }
  }

  if (content) {
    const tags = content.match(/#[\w\u0400-\u04FF\u4e00-\u9fff]+/gi);
    if (tags) {
      const uniqueTags = [...new Set(tags.map(t => t.toLowerCase()))];
      for (const tag of uniqueTags) {
        run('INSERT OR IGNORE INTO hashtags (tag) VALUES (?)', [tag]);
        run('INSERT OR IGNORE INTO post_hashtags (postId, tag) VALUES (?, ?)', [postId, tag]);
      }
    }
  }

  const post = queryOne(`
    SELECT p.*, u.username, u.firstName, u.lastName, u.avatar,
      0 as likeCount, 0 as commentCount, 0 as userLiked,
      CASE WHEN EXISTS(SELECT 1 FROM polls WHERE postId = p.id) THEN 1 ELSE 0 END as hasPoll
    FROM posts p JOIN users u ON p.userId = u.id WHERE p.id = ?
  `, [postId]);
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

router.get('/:id/poll', auth, (req, res) => {
  const poll = queryOne('SELECT * FROM polls WHERE postId = ?', [req.params.id]);
  if (!poll) return res.status(404).json({ error: 'No poll found' });
  const options = query(`
    SELECT po.*, COUNT(pv.id) as voteCount,
      (SELECT COUNT(*) FROM poll_votes WHERE optionId = po.id AND userId = ?) as userVoted
    FROM poll_options po
    LEFT JOIN poll_votes pv ON pv.optionId = po.id
    WHERE po.pollId = ?
    GROUP BY po.id
  `, [req.userId, poll.id]);
  const totalVotes = options.reduce((sum, o) => sum + o.voteCount, 0);
  res.json({ ...poll, options, totalVotes });
});

router.post('/:id/poll/vote', auth, (req, res) => {
  const { optionId } = req.body;
  const poll = queryOne('SELECT * FROM polls WHERE postId = ?', [req.params.id]);
  if (!poll) return res.status(404).json({ error: 'No poll found' });
  const existing = queryOne(
    'SELECT pv.id FROM poll_votes pv JOIN poll_options po ON pv.optionId = po.id WHERE po.pollId = ? AND pv.userId = ?',
    [poll.id, req.userId]
  );
  if (existing) return res.status(400).json({ error: 'Already voted' });
  const option = queryOne('SELECT * FROM poll_options WHERE id = ? AND pollId = ?', [optionId, poll.id]);
  if (!option) return res.status(400).json({ error: 'Invalid option' });
  run('INSERT INTO poll_votes (optionId, userId) VALUES (?, ?)', [optionId, req.userId]);
  const options = query(`
    SELECT po.*, COUNT(pv.id) as voteCount,
      (SELECT COUNT(*) FROM poll_votes WHERE optionId = po.id AND userId = ?) as userVoted
    FROM poll_options po
    LEFT JOIN poll_votes pv ON pv.optionId = po.id
    WHERE po.pollId = ?
    GROUP BY po.id
  `, [req.userId, poll.id]);
  const totalVotes = options.reduce((sum, o) => sum + o.voteCount, 0);
  res.json({ ...poll, options, totalVotes });
});

export default router;
