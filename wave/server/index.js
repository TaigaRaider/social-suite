import express from 'express';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';
import logger from './logger.js';
import helmet from 'helmet';
import { createServer } from 'http';
import { initDB, getDb } from './db.js';
import { rateLimit, auditLog, sanitizeInput, cleanupOldEntries } from './middleware/security.js';
import { csrfProtection } from './middleware/csrf.js';
import { setupWebSocket } from './socket.js';
import authRoutes from './routes/auth.js';
import groupRoutes from './routes/groups.js';
import messageRoutes from './routes/messages.js';
import friendRoutes from './routes/friends.js';
import notificationRoutes from './routes/notifications.js';
import exportRoutes from './routes/export.js';
import reactionRoutes from './routes/reactions.js';
import messagingFeaturesRoutes from './routes/messaging-features.js';
import twofaRoutes from './routes/twofa.js';
import passwordResetRoutes from './routes/password-reset.js';
import cryptoRoutes from './routes/crypto.js';
import accountRoutes from './routes/account.js';
import adminRoutes from './routes/admin.js';
import { startKeyRotation } from './keyRotation.js';
import cookieParser from 'cookie-parser';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3004;

setupWebSocket(server);

app.use(compression());
app.use(pinoHttp({ logger }));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim());
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));
app.use(sanitizeInput());
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(csrfProtection);
app.use(auditLog(getDb()));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many auth attempts' });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'wave', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', exportRoutes);
app.use('/api/reactions', reactionRoutes);
app.use('/api/messaging', messagingFeaturesRoutes);
app.use('/api/2fa', twofaRoutes);
app.use('/api/auth', passwordResetRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, _next) => {
  logger.error({ err, method: req.method, path: req.path }, 'Request error');
  res.status(err.status || 500).json({ error: 'Internal server error' });
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
});
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled rejection');
});

cleanupOldEntries();

async function start() {
  await initDB();
  startKeyRotation();
  server.listen(PORT, () => {
    logger.info({ port: PORT }, 'Wave server started');
  });
}

start().catch(console.error);
