import { Router } from 'express';
import { query, queryOne, run } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.post('/block/:userId', auth, (req, res) => {
  const targetId = parseInt(req.params.userId);
  if (targetId === req.userId) return res.status(400).json({ error: 'Cannot block yourself' });

  const existing = queryOne('SELECT id FROM blocks WHERE blockerId = ? AND blockedId = ?', [req.userId, targetId]);
  if (existing) return res.status(409).json({ error: 'Already blocked' });

  run('INSERT INTO blocks (blockerId, blockedId) VALUES (?, ?)', [req.userId, targetId]);
  run("UPDATE friendships SET status = 'declined' WHERE (requesterId = ? AND addresseeId = ?) OR (requesterId = ? AND addresseeId = ?)", [req.userId, targetId, targetId, req.userId]);
  res.json({ success: true, blocked: true });
});

router.delete('/block/:userId', auth, (req, res) => {
  const targetId = parseInt(req.params.userId);
  run('DELETE FROM blocks WHERE blockerId = ? AND blockedId = ?', [req.userId, targetId]);
  res.json({ success: true, blocked: false });
});

router.get('/blocked', auth, (req, res) => {
  const blocked = query(`
    SELECT u.id, u.username, u.firstName, u.lastName, u.avatar
    FROM blocks b JOIN users u ON b.blockedId = u.id
    WHERE b.blockerId = ?
    ORDER BY b.createdAt DESC
  `, [req.userId]);
  res.json(blocked);
});

router.post('/mute/:userId', auth, (req, res) => {
  const targetId = parseInt(req.params.userId);
  const existing = queryOne('SELECT id FROM mutes WHERE muterId = ? AND mutedId = ?', [req.userId, targetId]);
  if (existing) {
    run('DELETE FROM mutes WHERE muterId = ? AND mutedId = ?', [req.userId, targetId]);
    return res.json({ muted: false });
  }
  run('INSERT INTO mutes (muterId, mutedId) VALUES (?, ?)', [req.userId, targetId]);
  res.json({ muted: true });
});

router.get('/muted', auth, (req, res) => {
  const muted = query(`
    SELECT u.id, u.username, u.firstName, u.lastName, u.avatar
    FROM mutes m JOIN users u ON m.mutedId = u.id
    WHERE m.muterId = ?
  `, [req.userId]);
  res.json(muted);
});

router.post('/report', auth, (req, res) => {
  const { targetType, targetId, reason, details } = req.body;
  if (!targetType || !targetId || !reason) {
    return res.status(400).json({ error: 'targetType, targetId, and reason are required' });
  }
  const validTypes = ['post', 'comment', 'user', 'message'];
  if (!validTypes.includes(targetType)) {
    return res.status(400).json({ error: 'Invalid targetType' });
  }

  const existing = queryOne(
    'SELECT id FROM reports WHERE reporterId = ? AND targetType = ? AND targetId = ? AND status = "pending"',
    [req.userId, targetType, targetId]
  );
  if (existing) return res.status(409).json({ error: 'Already reported' });

  run('INSERT INTO reports (reporterId, targetType, targetId, reason, details) VALUES (?, ?, ?, ?, ?)',
    [req.userId, targetType, targetId, reason, details || '']);
  res.json({ success: true });
});

router.get('/reports', auth, (req, res) => {
  const reports = query(`
    SELECT r.*, u.username as reporterUsername
    FROM reports r JOIN users u ON r.reporterId = u.id
    WHERE r.targetType = 'post' AND r.targetId IN (
      SELECT id FROM posts WHERE userId = ?
    )
    ORDER BY r.createdAt DESC
  `, [req.userId]);
  res.json(reports);
});

export function isBlocked(db_query, userId, targetId) {
  const blocked = queryOne('SELECT id FROM blocks WHERE (blockerId = ? AND blockedId = ?) OR (blockerId = ? AND blockedId = ?)',
    [userId, targetId, targetId, userId]);
  return !!blocked;
}

export default router;
