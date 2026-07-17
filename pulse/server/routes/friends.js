import { Router } from 'express';
import { query, queryOne, run } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.get('/', auth, (req, res) => {
  const friends = query(
    `SELECT u.id, u.username, u.firstName, u.lastName, u.avatar, u.status, u.lastSeen
     FROM users u
     JOIN friends f ON (f.userId1 = ? AND f.userId2 = u.id) OR (f.userId2 = ? AND f.userId1 = u.id)
     WHERE f.status = 'accepted'`,
    [req.userId, req.userId]
  );
  res.json(friends);
});

router.post('/request/:userId', auth, (req, res) => {
  const targetId = parseInt(req.params.userId);
  if (targetId === req.userId) return res.status(400).json({ error: 'Cannot friend yourself' });

  const existing = queryOne(
    'SELECT id, status FROM friends WHERE (userId1 = ? AND userId2 = ?) OR (userId1 = ? AND userId2 = ?)',
    [req.userId, targetId, targetId, req.userId]
  );

  if (existing) {
    if (existing.status === 'accepted') {
      return res.status(400).json({ error: 'Already friends' });
    }
    run('UPDATE friends SET status = ? WHERE id = ?', ['accepted', existing.id]);
    run('INSERT INTO notifications (userId, fromUserId, type, referenceId) VALUES (?, ?, ?, ?)',
      [targetId, req.userId, 'friend_accept', existing.id]);
    return res.json({ ok: true, status: 'accepted' });
  }

  const result = run(
    'INSERT INTO friends (userId1, userId2, status) VALUES (?, ?, ?)',
    [Math.min(req.userId, targetId), Math.max(req.userId, targetId), 'accepted']
  );

  run('INSERT INTO notifications (userId, fromUserId, type, referenceId) VALUES (?, ?, ?, ?)',
    [targetId, req.userId, 'friend_request', result.lastId]);

  res.json({ ok: true, status: 'accepted' });
});

router.delete('/:userId', auth, (req, res) => {
  const targetId = parseInt(req.params.userId);
  run(
    'DELETE FROM friends WHERE (userId1 = ? AND userId2 = ?) OR (userId1 = ? AND userId2 = ?)',
    [req.userId, targetId, targetId, req.userId]
  );
  res.json({ ok: true });
});

router.get('/suggestions', auth, (req, res) => {
  const friends = query(
    'SELECT CASE WHEN userId1 = ? THEN userId2 ELSE userId1 END as friendId FROM friends WHERE userId1 = ? OR userId2 = ?',
    [req.userId, req.userId, req.userId]
  );
  const friendIds = friends.map(f => f.friendId);
  let suggestions;
  if (friendIds.length > 0) {
    const placeholders = friendIds.map(() => '?').join(',');
    suggestions = query(
      `SELECT id, username, firstName, lastName, avatar, status FROM users
       WHERE id != ? AND id NOT IN (${placeholders}) LIMIT 10`,
      [req.userId, ...friendIds]
    );
  } else {
    suggestions = query(
      'SELECT id, username, firstName, lastName, avatar, status FROM users WHERE id != ? LIMIT 10',
      [req.userId]
    );
  }
  res.json(suggestions);
});

export default router;
