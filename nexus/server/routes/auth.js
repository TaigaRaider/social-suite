import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne, run } from '../db.js';
import { generateToken, auth } from '../auth.js';

const router = Router();

router.post('/register', (req, res) => {
  const { username, email, password, firstName, lastName } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email and password required' });
  }
  const existing = queryOne('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
  if (existing) {
    return res.status(409).json({ error: 'Username or email already taken' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const result = run('INSERT INTO users (username, email, password, firstName, lastName) VALUES (?, ?, ?, ?, ?)', [username, email, hash, firstName || '', lastName || '']);
  const token = generateToken(result.lastInsertRowid);
  res.json({ token, user: { id: result.lastInsertRowid, username, email, firstName: firstName || '', lastName: lastName || '' } });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = queryOne('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken(user.id);
  const { password: _, ...safe } = user;
  res.json({ token, user: safe });
});

router.get('/me', auth, (req, res) => {
  const user = queryOne('SELECT id, username, email, firstName, lastName, bio, avatar, coverPhoto, createdAt FROM users WHERE id = ?', [req.userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
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
  const users = query("SELECT id, username, firstName, lastName, avatar FROM users WHERE username LIKE ? OR firstName LIKE ? OR lastName LIKE ? LIMIT 20", [`%${q}%`, `%${q}%`, `%${q}%`]);
  res.json(users);
});

export default router;
