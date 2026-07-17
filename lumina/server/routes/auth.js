import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne, run } from '../db.js';
import { generateToken, auth } from '../auth.js';

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

router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ error: 'Login and password are required' });
    }

    const user = queryOne('SELECT * FROM users WHERE username = ? OR email = ?', [login, login]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

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
    "SELECT id, username, firstName, lastName, avatar FROM users WHERE username LIKE ? OR firstName LIKE ? OR lastName LIKE ? LIMIT 20",
    [`%${q}%`, `%${q}%`, `%${q}%`]
  );
  res.json(users);
});

export default router;
