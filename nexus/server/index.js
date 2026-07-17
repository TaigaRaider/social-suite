import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDB } from './db.js';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import friendRoutes from './routes/friends.js';
import messageRoutes from './routes/messages.js';
import notificationRoutes from './routes/notifications.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function start() {
  await initDB();

  const app = express();
  const PORT = process.env.PORT || 3001;

  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(join(__dirname, 'uploads')));

  app.use('/api/auth', authRoutes);
  app.use('/api/posts', postRoutes);
  app.use('/api/friends', friendRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/notifications', notificationRoutes);

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
