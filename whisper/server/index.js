import express from 'express';
import cors from 'cors';
import { initDB } from './db.js';
import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import followRoutes from './routes/follows.js';
import notificationRoutes from './routes/notifications.js';

const app = express();
const PORT = 3005;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Whisper server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
