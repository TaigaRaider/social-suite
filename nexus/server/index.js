import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDB, getDb } from './db.js';
import helmet from 'helmet';
import { rateLimit, sanitizeInput, cleanupOldEntries, auditLog } from './middleware/security.js';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import friendRoutes from './routes/friends.js';
import messageRoutes from './routes/messages.js';
import notificationRoutes from './routes/notifications.js';
import exportRoutes from './routes/export.js';
import reactionRoutes from './routes/reactions.js';
import analyticsRoutes from './routes/analytics.js';
import hashtagRoutes from './routes/hashtags.js';
import searchRoutes from './routes/search.js';
import moderationRoutes from './routes/moderation.js';
import twofaRoutes from './routes/twofa.js';
import passwordResetRoutes from './routes/password-reset.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function start() {
  await initDB();

  const app = express();
  const PORT = process.env.PORT || 3001;

  app.use(helmet());
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
  }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
  app.use(sanitizeInput());
  app.use(express.json());
  app.use('/uploads', express.static(join(__dirname, 'uploads')));
  app.use(auditLog(getDb()));

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many auth attempts' });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

  app.use('/api/auth', authRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/friends', friendRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api', exportRoutes);
  app.use('/api/reactions', reactionRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/hashtags', hashtagRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/moderation', moderationRoutes);
  app.use('/api/2fa', twofaRoutes);
  app.use('/api/auth', passwordResetRoutes);

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  cleanupOldEntries();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
