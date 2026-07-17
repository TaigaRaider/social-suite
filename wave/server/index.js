import express from 'express';
import cors from 'cors';
import { initDB } from './db.js';
import authRoutes from './routes/auth.js';
import groupRoutes from './routes/groups.js';
import messageRoutes from './routes/messages.js';
import friendRoutes from './routes/friends.js';
import notificationRoutes from './routes/notifications.js';

const app = express();
const PORT = 3004;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log(`Wave server running on port ${PORT}`);
  });
}

start().catch(console.error);
