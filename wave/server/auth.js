import jwt from 'jsonwebtoken';

const SECRET = 'wave-secret-2024';

export function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username, email: user.email }, SECRET, { expiresIn: '7d' });
}

export function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token provided' });
  const token = header.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
