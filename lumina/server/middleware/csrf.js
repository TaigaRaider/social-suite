import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'csrf_token';
const isProd = process.env.NODE_ENV === 'production';

export function csrfProtection(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    if (!req.cookies || !req.cookies[CSRF_COOKIE_NAME]) {
      const token = crypto.randomBytes(32).toString('hex');
      res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false,
        secure: isProd,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
      });
    }
    return next();
  }

  const cookieToken = req.cookies ? req.cookies[CSRF_COOKIE_NAME] : null;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
}
