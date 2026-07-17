import { Router } from 'express';
import { query, queryOne, run } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.get('/', auth, (req, res) => {
  const friends = query(`
    SELECT u.id, u.username, u.firstName, u.lastName, u.avatar,
      CASE WHEN f.requesterId = ? THEN f.addresseeId ELSE f.requesterId END as friendId,
      f.status, f.createdAt as friendsSince
    FROM friendships f
    JOIN users u ON u.id = CASE WHEN f.requesterId = ? THEN f.addresseeId ELSE f.requesterId END
    WHERE (f.requesterId = ? OR f.addresseeId = ?) AND f.status = 'accepted'
  `, [req.userId, req.userId, req.userId, req.userId]);
  res.json(friends);
});

router.get('/requests', auth, (req, res) => {
  const requests = query(`
    SELECT f.*, u.username, u.firstName, u.lastName, u.avatar
    FROM friendships f JOIN users u ON u.id = f.requesterId
    WHERE f.addresseeId = ? AND f.status = 'pending'
    ORDER BY f.createdAt DESC
  `, [req.userId]);
  res.json(requests);
});

router.post('/request/:userId', auth, (req, res) => {
  const targetId = parseInt(req.params.userId);
  if (targetId === req.userId) return res.status(400).json({ error: "Can't friend yourself" });
  const existing = queryOne("SELECT * FROM friendships WHERE (requesterId = ? AND addresseeId = ?) OR (requesterId = ? AND addresseeId = ?)", [req.userId, targetId, targetId, req.userId]);
  if (existing) {
    if (existing.status === 'accepted') return res.status(409).json({ error: 'Already friends' });
    return res.status(409).json({ error: 'Request already pending' });
  }
  run('INSERT INTO friendships (requesterId, addresseeId, status) VALUES (?, ?, ?)', [req.userId, targetId, 'pending']);
  run('INSERT INTO notifications (userId, fromUserId, type) VALUES (?, ?, ?)', [targetId, req.userId, 'friend_request']);
  res.json({ success: true });
});

router.put('/accept/:id', auth, (req, res) => {
  run("UPDATE friendships SET status = 'accepted' WHERE id = ? AND addresseeId = ?", [req.params.id, req.userId]);
  res.json({ success: true });
});

router.put('/decline/:id', auth, (req, res) => {
  run("UPDATE friendships SET status = 'declined' WHERE id = ? AND addresseeId = ?", [req.params.id, req.userId]);
  res.json({ success: true });
});

router.delete('/:userId', auth, (req, res) => {
  run('DELETE FROM friendships WHERE (requesterId = ? AND addresseeId = ?) OR (requesterId = ? AND addresseeId = ?)', [req.userId, req.params.userId, req.params.userId, req.userId]);
  res.json({ success: true });
});

router.get('/suggestions', auth, (req, res) => {
  const suggestions = query(`
    SELECT id, username, firstName, lastName, avatar FROM users
    WHERE id != ? AND id NOT IN (
      SELECT CASE WHEN requesterId = ? THEN addresseeId ELSE requesterId END
      FROM friendships WHERE (requesterId = ? OR addresseeId = ?)
    )
    ORDER BY RANDOM() LIMIT 10
  `, [req.userId, req.userId, req.userId, req.userId]);
  res.json(suggestions);
});

export default router;
