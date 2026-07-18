import { Router } from 'express';
import { query, queryOne, run } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.post('/', auth, (req, res) => {
  const { targetId, targetType, emoji } = req.body;
  if (!targetId || !targetType || !emoji) {
    return res.status(400).json({ error: 'targetId, targetType, and emoji are required' });
  }
  const existing = queryOne(
    'SELECT id FROM reactions WHERE targetId = ? AND userId = ? AND targetType = ?',
    [targetId, req.userId, targetType]
  );
  if (existing) {
    if (existing.emoji === emoji || !existing.emoji) {
      run('DELETE FROM reactions WHERE id = ?', [existing.id]);
      res.json({ removed: true, emoji });
    } else {
      run('UPDATE reactions SET emoji = ? WHERE id = ?', [emoji, existing.id]);
      res.json({ removed: false, emoji });
    }
  } else {
    run('INSERT INTO reactions (targetId, targetType, userId, emoji) VALUES (?, ?, ?, ?)',
      [targetId, targetType, req.userId, emoji]);
    if (targetType === 'post') {
      const post = queryOne('SELECT userId FROM posts WHERE id = ?', [targetId]);
      if (post && post.userId !== req.userId) {
        run('INSERT INTO notifications (userId, fromUserId, type, referenceId) VALUES (?, ?, ?, ?)',
          [post.userId, req.userId, 'reaction', targetId]);
      }
    }
    res.json({ removed: false, emoji });
  }
});

router.get('/:targetId/:targetType', auth, (req, res) => {
  const reactions = query(
    'SELECT emoji, COUNT(*) as count FROM reactions WHERE targetId = ? AND targetType = ? GROUP BY emoji',
    [req.params.targetId, req.params.targetType]
  );
  const userReactions = query(
    'SELECT emoji FROM reactions WHERE targetId = ? AND targetType = ? AND userId = ?',
    [req.params.targetId, req.params.targetType, req.userId]
  );
  res.json({ reactions, userReactions: userReactions.map(r => r.emoji) });
});

export default router;
