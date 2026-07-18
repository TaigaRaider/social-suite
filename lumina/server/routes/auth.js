import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { query, queryOne, run } from '../db.js';
import { generateToken, auth } from '../auth.js';

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

    const existing = queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = run(
      'INSERT INTO users (username, email, password, firstName, lastName) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashedPassword, firstName || '', lastName || '']
    );

    const user = queryOne('SELECT id, username, email, firstName, lastName, bio, avatar, createdAt FROM users WHERE id = ?', [result.lastId]);
    const token = generateToken(user);
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', [
  body('login').trim().notEmpty().withMessage('Login is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    if (!validate(req, res)) return;
    const { login, password } = req.body;

    const user = queryOne('SELECT * FROM users WHERE username = ? OR email = ?', [login, login]);
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

    const { password: _, ...safeUser } = user;
    const token = generateToken(safeUser);
    res.json({ token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', auth, (req, res) => {
  const user = queryOne('SELECT id, username, email, firstName, lastName, bio, avatar, createdAt FROM users WHERE id = ?', [req.userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const postCount = queryOne('SELECT COUNT(*) as count FROM posts WHERE userId = ?', [req.userId]);
  const followerCount = queryOne('SELECT COUNT(*) as count FROM follows WHERE followingId = ?', [req.userId]);
  const followingCount = queryOne('SELECT COUNT(*) as count FROM follows WHERE followerId = ?', [req.userId]);

  res.json({
    ...user,
    postCount: postCount.count,
    followerCount: followerCount.count,
    followingCount: followingCount.count
  });
});

router.get('/user/:id', auth, (req, res) => {
  const user = queryOne('SELECT id, username, email, firstName, lastName, bio, avatar, createdAt FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const postCount = queryOne('SELECT COUNT(*) as count FROM posts WHERE userId = ?', [user.id]);
  const followerCount = queryOne('SELECT COUNT(*) as count FROM follows WHERE followingId = ?', [user.id]);
  const followingCount = queryOne('SELECT COUNT(*) as count FROM follows WHERE followerId = ?', [user.id]);
  const isFollowing = queryOne('SELECT id FROM follows WHERE followerId = ? AND followingId = ?', [req.userId, user.id]);

  res.json({
    ...user,
    postCount: postCount.count,
    followerCount: followerCount.count,
    followingCount: followingCount.count,
    isFollowing: !!isFollowing
  });
});

router.put('/me', auth, (req, res) => {
  const { firstName, lastName, bio, avatar } = req.body;
  run(
    'UPDATE users SET firstName = COALESCE(?, firstName), lastName = COALESCE(?, lastName), bio = COALESCE(?, bio), avatar = COALESCE(?, avatar) WHERE id = ?',
    [firstName, lastName, bio, avatar, req.userId]
  );
  const user = queryOne('SELECT id, username, email, firstName, lastName, bio, avatar, createdAt FROM users WHERE id = ?', [req.userId]);
  res.json(user);
});

router.get('/search', auth, (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  const users = query(
    "SELECT id, username, firstName, lastName, avatar, status FROM users WHERE username LIKE ? OR firstName LIKE ? OR lastName LIKE ? LIMIT 20",
    [`%${q}%`, `%${q}%`, `%${q}%`]
  );
  res.json(users);
});

router.put('/status', auth, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['online', 'away', 'offline', 'dnd'];
  const s = validStatuses.includes(status) ? status : 'offline';
  run('UPDATE users SET status = ?, lastSeen = CURRENT_TIMESTAMP WHERE id = ?', [s, req.userId]);
  res.json({ ok: true });
});

export default router;
