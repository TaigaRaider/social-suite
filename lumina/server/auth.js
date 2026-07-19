import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('[SECURITY] JWT_SECRET environment variable not set. Using auto-generated key. Set JWT_SECRET in production!');
}
export const SECRET = JWT_SECRET || crypto.randomBytes(64).toString('hex');

const JWT_SECRET_PREV = process.env.JWT_SECRET_PREVIOUS;
export const SECRET_PREVIOUS = JWT_SECRET_PREV || null;

export const COOKIE_NAME = 'lumina_token';
const isProd = process.env.NODE_ENV === 'production';

export function setTokenCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearTokenCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, SECRET, { expiresIn: '7d' });
}

export function auth(req, res, next) {
  let token = null;
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    token = req.cookies[COOKIE_NAME];
  } else {
    const header = req.headers.authorization;
    if (header) {
      token = header.split(' ')[1];
    }
  }
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    let decoded;
    try {
      decoded = jwt.verify(token, SECRET);
    } catch (err) {
      if (SECRET_PREVIOUS) {
        decoded = jwt.verify(token, SECRET_PREVIOUS);
      } else {
        throw err;
      }
    }
    req.userId = decoded.id;
    req.username = decoded.username;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
