import express from 'express';
import cors from 'cors';
import { initDB } from './db.js';
import authRoutes from './routes/auth.js';
import postsRoutes from './routes/posts.js';
import followsRoutes from './routes/follows.js';
import storiesRoutes from './routes/stories.js';
import notificationsRoutes from './routes/notifications.js';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/follows', followsRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/api/notifications', notificationsRoutes);

async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`Lumina server running on port ${PORT}`);
  });
}

start();
