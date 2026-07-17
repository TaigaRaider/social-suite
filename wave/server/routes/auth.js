import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken, auth } from '../auth.js';
import { query, queryOne, run } from '../db.js';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
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
    const user = queryOne('SELECT id, username, email, firstName, lastName, bio, avatar, status FROM users WHERE id = ?', [result.lastId]);
    const token = generateToken(user);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    run('UPDATE users SET status = ?, lastSeen = datetime("now") WHERE id = ?', ['online', user.id]);
    const token = generateToken(user);
    const { password: _, ...safeUser } = user;
    safeUser.status = 'online';
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', auth, (req, res) => {
  try {
    const user = queryOne('SELECT id, username, email, firstName, lastName, bio, avatar, status, lastSeen FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/user/:id', auth, (req, res) => {
  try {
    const user = queryOne('SELECT id, username, email, firstName, lastName, bio, avatar, status, lastSeen FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/me', auth, (req, res) => {
  try {
    const { firstName, lastName, bio, avatar } = req.body;
    run(
      'UPDATE users SET firstName = COALESCE(?, firstName), lastName = COALESCE(?, lastName), bio = COALESCE(?, bio), avatar = COALESCE(?, avatar) WHERE id = ?',
      [firstName, lastName, bio, avatar, req.user.id]
    );
    const user = queryOne('SELECT id, username, email, firstName, lastName, bio, avatar, status FROM users WHERE id = ?', [req.user.id]);
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/search', auth, (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const users = query(
      'SELECT id, username, email, firstName, lastName, avatar FROM users WHERE (username LIKE ? OR email LIKE ? OR firstName LIKE ? OR lastName LIKE ?) AND id != ?',
      [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, req.user.id]
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
