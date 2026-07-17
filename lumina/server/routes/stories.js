import { Router } from 'express';
import { query, run } from '../db.js';
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

export default router;
