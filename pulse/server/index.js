import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { initDB, getDb } from './db.js';
import { rateLimit, sanitizeInput, cleanupOldEntries, auditLog } from './middleware/security.js';
import { setupWebSocket } from './socket.js';
import authRoutes from './routes/auth.js';
import conversationRoutes from './routes/conversations.js';
import friendRoutes from './routes/friends.js';
import notificationRoutes from './routes/notifications.js';
import exportRoutes from './routes/export.js';
import reactionRoutes from './routes/reactions.js';
import messagingFeaturesRoutes from './routes/messaging-features.js';
import twofaRoutes from './routes/twofa.js';
import passwordResetRoutes from './routes/password-reset.js';

const app = express();
const server = createServer(app);
const PORT = 3003;

setupWebSocket(server);

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
app.use('/api/conversations', conversationRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', exportRoutes);
app.use('/api/reactions', reactionRoutes);
app.use('/api/messaging', messagingFeaturesRoutes);
app.use('/api/2fa', twofaRoutes);
app.use('/api/auth', passwordResetRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

cleanupOldEntries();

await initDB();

server.listen(PORT, () => {
  console.log(`Pulse server running on port ${PORT} with WebSocket`);
});
