import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne, run } from '../db.js';
import { generateToken, auth } from '../auth.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }
    const existing = queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const result = run(
      'INSERT INTO users (username, email, password, firstName, lastName) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashed, firstName || '', lastName || '']
    );
    const user = queryOne('SELECT id, username, email, firstName, lastName, avatar, status FROM users WHERE id = ?', [result.lastId]);
    const token = generateToken(user);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    run('UPDATE users SET status = ?, lastSeen = CURRENT_TIMESTAMP WHERE id = ?', ['online', user.id]);
    const safeUser = { id: user.id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName, bio: user.bio, avatar: user.avatar, status: 'online' };
    const token = generateToken(safeUser);
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', auth, (req, res) => {
  const user = queryOne('SELECT id, username, email, firstName, lastName, bio, avatar, status, lastSeen FROM users WHERE id = ?', [req.userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.get('/user/:id', auth, (req, res) => {
  const user = queryOne('SELECT id, username, email, firstName, lastName, bio, avatar, status, lastSeen FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.put('/me', auth, (req, res) => {
  const { firstName, lastName, bio, avatar, status } = req.body;
  const updates = [];
  const params = [];
  if (firstName !== undefined) { updates.push('firstName = ?'); params.push(firstName); }
  if (lastName !== undefined) { updates.push('lastName = ?'); params.push(lastName); }
  if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }
  if (avatar !== undefined) { updates.push('avatar = ?'); params.push(avatar); }
  if (status !== undefined) { updates.push('status = ?'); params.push(status); }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  params.push(req.userId);
  run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  const user = queryOne('SELECT id, username, email, firstName, lastName, bio, avatar, status FROM users WHERE id = ?', [req.userId]);
  res.json(user);
});

router.get('/search', auth, (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  const users = query(
    'SELECT id, username, firstName, lastName, avatar, status FROM users WHERE (username LIKE ? OR firstName LIKE ? OR lastName LIKE ? OR email LIKE ?) AND id != ? LIMIT 20',
    [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, req.userId]
  );
  res.json(users);
});

router.put('/status', auth, (req, res) => {
  const { status } = req.body;
  run('UPDATE users SET status = ?, lastSeen = CURRENT_TIMESTAMP WHERE id = ?', [status || 'offline', req.userId]);
  res.json({ ok: true });
});

export default router;
