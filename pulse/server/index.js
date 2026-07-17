import express from 'express';
import cors from 'cors';
import { initDB } from './db.js';
import authRoutes from './routes/auth.js';
import conversationRoutes from './routes/conversations.js';
import friendRoutes from './routes/friends.js';
import notificationRoutes from './routes/notifications.js';

const app = express();
const PORT = 3003;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

await initDB();

app.listen(PORT, () => {
  console.log(`Pulse server running on port ${PORT}`);
});
