import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initDB, getDb } from './db.js';
import { rateLimit, auditLog, sanitizeInput, cleanupOldEntries } from './middleware/security.js';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import followRoutes from './routes/follows.js';
import notificationRoutes from './routes/notifications.js';
import exportRoutes from './routes/export.js';
import reactionRoutes from './routes/reactions.js';
import analyticsRoutes from './routes/analytics.js';
import hashtagRoutes from './routes/hashtags.js';
import searchRoutes from './routes/search.js';
import moderationRoutes from './routes/moderation.js';
import twofaRoutes from './routes/twofa.js';
import passwordResetRoutes from './routes/password-reset.js';

const app = express();
const PORT = 3005;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use(sanitizeInput());
app.use(express.json());
app.use(auditLog(getDb()));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many auth attempts' });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/follows', followRoutes);
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

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Whisper server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
