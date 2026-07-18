const rateLimitStore = new Map();

export function rateLimit({ windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests' } = {}) {
  return (req, res, next) => {
    const key = `${req.ip}-${req.path}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now - entry.start > windowMs) {
      rateLimitStore.set(key, { start: now, count: 1 });
      return next();
    }

    entry.count++;
    if (entry.count > max) {
      return res.status(429).json({ error: message });
    }
    next();
  };
}

export function auditLog(db) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      try {
        const status = res.statusCode;
        if (status >= 400 || req.method !== 'GET') {
          const userId = req.userId || null;
          const stmt = db.prepare('INSERT INTO audit_log (userId, action, method, path, statusCode, ip) VALUES (?, ?, ?, ?, ?, ?)');
          stmt.bind([userId, `${req.method} ${req.path}`, req.method, req.path, status, req.ip]);
          stmt.step();
          stmt.free();
        }
      } catch (e) { /* ignore */ }
      return originalJson(body);
    };
    next();
  };
}

export function sanitizeInput() {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      for (const key of Object.keys(req.body)) {
        if (typeof req.body[key] === 'string') {
          req.body[key] = req.body[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
          req.body[key] = req.body[key].replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
        }
      }
    }
    next();
  };
}

export function cleanupOldEntries() {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      if (now - entry.start > 30 * 60 * 1000) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}
