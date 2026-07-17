import jwt from 'jsonwebtoken';

const SECRET = 'lumina-secret-2024';

export function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '7d' });
}

export function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token provided' });

  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.userId = decoded.id;
    req.username = decoded.username;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
