import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { queryOne, run } from '../db.js';
import { auth } from '../auth.js';

const router = Router();

router.post('/forgot', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = queryOne('SELECT id, email FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.json({ message: 'If an account exists with this email, a reset link has been sent.' });
    }

    run('DELETE FROM password_resets WHERE userId = ? AND used = 0', [user.id]);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    run('INSERT INTO password_resets (userId, token, expiresAt) VALUES (?, ?, ?)',
      [user.id, token, expiresAt]);

    res.json({
      message: 'If an account exists with this email, a reset link has been sent.',
      resetToken: token,
      expiresAt
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset', (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const reset = queryOne(
      'SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expiresAt > datetime("now")',
      [token]
    );
    if (!reset) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const hash = bcrypt.hashSync(newPassword, 10);
    run('UPDATE users SET password = ? WHERE id = ?', [hash, reset.userId]);
    run('UPDATE password_resets SET used = 1 WHERE id = ?', [reset.id]);

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/change-password', auth, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password are required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const user = queryOne('SELECT id, password FROM users WHERE id = ?', [req.userId]);
    if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    run('UPDATE users SET password = ? WHERE id = ?', [hash, req.userId]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
