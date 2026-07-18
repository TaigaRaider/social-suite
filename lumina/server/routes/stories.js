import { Router } from 'express';
import { query, queryOne, run } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.get('/', auth, (req, res) => {
  run("DELETE FROM stories WHERE expiresAt < datetime('now')");

  const stories = query(`
    SELECT s.*, u.username, u.avatar
    FROM stories s
    JOIN users u ON s.userId = u.id
    WHERE s.userId IN (SELECT followingId FROM follows WHERE followerId = ?) OR s.userId = ?
    ORDER BY s.createdAt DESC
  `, [req.userId, req.userId]);
  res.json(stories);
});

router.post('/', auth, (req, res) => {
  const { image } = req.body;
  if (!image) return res.status(400).json({ error: 'Image URL is required' });

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const result = run('INSERT INTO stories (userId, image, expiresAt) VALUES (?, ?, ?)', [req.userId, image, expiresAt]);
  const story = query('SELECT s.*, u.username, u.avatar FROM stories s JOIN users u ON s.userId = u.id WHERE s.id = ?', [result.lastId]);
  res.json(story[0]);
});

router.post('/:id/react', auth, (req, res) => {
  const { emoji } = req.body;
  if (!emoji) return res.status(400).json({ error: 'emoji is required' });
  const story = queryOne('SELECT * FROM stories WHERE id = ?', [req.params.id]);
  if (!story) return res.status(404).json({ error: 'Story not found' });

  const existing = queryOne('SELECT id, emoji FROM story_reactions WHERE storyId = ? AND userId = ?', [req.params.id, req.userId]);
  if (existing) {
    if (existing.emoji === emoji) {
      run('DELETE FROM story_reactions WHERE id = ?', [existing.id]);
      res.json({ removed: true, emoji });
    } else {
      run('UPDATE story_reactions SET emoji = ? WHERE id = ?', [emoji, existing.id]);
      res.json({ removed: false, emoji });
    }
  } else {
    run('INSERT INTO story_reactions (storyId, userId, emoji) VALUES (?, ?, ?)', [req.params.id, req.userId, emoji]);
    if (story.userId !== req.userId) {
      run('INSERT INTO notifications (userId, fromUserId, type, referenceId) VALUES (?, ?, ?, ?)',
        [story.userId, req.userId, 'story_reaction', parseInt(req.params.id)]);
    }
    res.json({ removed: false, emoji });
  }
});

router.get('/:id/reactions', auth, (req, res) => {
  const reactions = query(
    'SELECT emoji, COUNT(*) as count FROM story_reactions WHERE storyId = ? GROUP BY emoji',
    [req.params.id]
  );
  const userReactions = query(
    'SELECT emoji FROM story_reactions WHERE storyId = ? AND userId = ?',
    [req.params.id, req.userId]
  );
  res.json({ reactions, userReactions: userReactions.map(r => r.emoji) });
});

export default router;
