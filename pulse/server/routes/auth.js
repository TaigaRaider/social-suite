import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { query, queryOne, run } from '../db.js';
import { generateToken, auth, setTokenCookie, clearTokenCookie } from '../auth.js';

const router = Router();

const validate = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array()[0].msg });
    return false;
  }
  return true;
};

router.post('/register', [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    if (!validate(req, res)) return;
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
    setTokenCookie(res, token);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
], async (req, res) => {
  try {
    if (!validate(req, res)) return;
    const { email, password } = req.body;

    const user = queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingMs = new Date(user.lockedUntil) - new Date();
      const remainingMin = Math.ceil(remainingMs / 60000);
      return res.status(423).json({ error: `Account locked. Try again in ${remainingMin} minute(s).` });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const attempts = (user.failedAttempts || 0) + 1;
      if (attempts >= 5) {
        const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        run('UPDATE users SET failedAttempts = ?, lockedUntil = ? WHERE id = ?', [attempts, lockUntil, user.id]);
        return res.status(423).json({ error: 'Account locked due to too many failed attempts. Try again in 15 minutes.' });
      }
      run('UPDATE users SET failedAttempts = ? WHERE id = ?', [attempts, user.id]);
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    run('UPDATE users SET failedAttempts = 0, lockedUntil = NULL WHERE id = ?', [user.id]);

    run('UPDATE users SET status = ?, lastSeen = CURRENT_TIMESTAMP WHERE id = ?', ['online', user.id]);
    const safeUser = { id: user.id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName, bio: user.bio, avatar: user.avatar, status: 'online' };
    const token = generateToken(safeUser);
    setTokenCookie(res, token);
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => {
  clearTokenCookie(res);
  res.json({ ok: true });
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
