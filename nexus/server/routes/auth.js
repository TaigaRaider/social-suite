import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne, run } from '../db.js';
import { generateToken, auth, setTokenCookie, clearTokenCookie } from '../auth.js';
import { body, validationResult } from 'express-validator';

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
], (req, res) => {
  if (!validate(req, res)) return;
  const { username, email, password, firstName, lastName } = req.body;
  const existing = queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
  if (existing) {
    return res.status(409).json({ error: 'Username or email already taken' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const result = run('INSERT INTO users (username, email, password, firstName, lastName) VALUES (?, ?, ?, ?, ?)', [username, email, hash, firstName || '', lastName || '']);
  const token = generateToken(result.lastInsertRowid);
  setTokenCookie(res, token);
  res.json({ token, user: { id: result.lastInsertRowid, username, email, firstName: firstName || '', lastName: lastName || '' } });
});

router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
], (req, res) => {
  if (!validate(req, res)) return;
  const { email, password } = req.body;

  const user = queryOne('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    const remainingMs = new Date(user.lockedUntil) - new Date();
    const remainingMin = Math.ceil(remainingMs / 60000);
    return res.status(423).json({ error: `Account locked. Try again in ${remainingMin} minute(s).` });
  }

  if (!bcrypt.compareSync(password, user.password)) {
    const attempts = (user.failedAttempts || 0) + 1;
    if (attempts >= 5) {
      const lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      run('UPDATE users SET failedAttempts = ?, lockedUntil = ? WHERE id = ?', [attempts, lockUntil, user.id]);
      return res.status(423).json({ error: 'Account locked due to too many failed attempts. Try again in 15 minutes.' });
    }
    run('UPDATE users SET failedAttempts = ? WHERE id = ?', [attempts, user.id]);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  run('UPDATE users SET failedAttempts = 0, lockedUntil = NULL WHERE id = ?', [user.id]);

  const token = generateToken(user.id);
  const { password: _, ...safe } = user;
  setTokenCookie(res, token);
  res.json({ token, user: safe });
});

router.post('/logout', (req, res) => {
  clearTokenCookie(res);
  res.json({ ok: true });
});

router.get('/me', auth, (req, res) => {
  const user = queryOne('SELECT id, username, email, firstName, lastName, bio, avatar, coverPhoto, createdAt FROM users WHERE id = ?', [req.userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const postCount = queryOne('SELECT COUNT(*) as count FROM posts WHERE userId = ?', [req.userId]).count;
  const friendCount = queryOne("SELECT COUNT(*) as count FROM friendships WHERE (requesterId = ? OR addresseeId = ?) AND status = 'accepted'", [req.userId, req.userId]).count;
  res.json({ ...user, postCount, friendCount });
});

router.get('/user/:id', auth, (req, res) => {
  const user = queryOne('SELECT id, username, email, firstName, lastName, bio, avatar, coverPhoto, createdAt FROM users WHERE id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const postCount = queryOne('SELECT COUNT(*) as count FROM posts WHERE userId = ?', [user.id]).count;
  const friendCount = queryOne("SELECT COUNT(*) as count FROM friendships WHERE (requesterId = ? OR addresseeId = ?) AND status = 'accepted'", [user.id, user.id]).count;
  const friendship = queryOne("SELECT * FROM friendships WHERE (requesterId = ? AND addresseeId = ?) OR (requesterId = ? AND addresseeId = ?)", [req.userId, user.id, user.id, req.userId]);
  res.json({ ...user, postCount, friendCount, friendshipStatus: friendship ? friendship.status : 'none', friendshipId: friendship ? friendship.id : null });
});

router.put('/me', auth, (req, res) => {
  const { firstName, lastName, bio } = req.body;
  run('UPDATE users SET firstName = COALESCE(?, firstName), lastName = COALESCE(?, lastName), bio = COALESCE(?, bio) WHERE id = ?', [firstName, lastName, bio, req.userId]);
  const user = queryOne('SELECT id, username, email, firstName, lastName, bio, avatar, coverPhoto FROM users WHERE id = ?', [req.userId]);
  res.json(user);
});

router.get('/search', auth, (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);
  const users = query("SELECT id, username, firstName, lastName, avatar, status FROM users WHERE username LIKE ? OR firstName LIKE ? OR lastName LIKE ? LIMIT 20", [`%${q}%`, `%${q}%`, `%${q}%`]);
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
