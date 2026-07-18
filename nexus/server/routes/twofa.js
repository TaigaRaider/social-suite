import { Router } from 'express';
import { queryOne, run } from '../db.js';
import { auth, generateToken } from '../auth.js';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

const router = Router();

function createTOTP(appName, username) {
  return new OTPAuth.TOTP({
    issuer: appName,
    label: username,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 })
  });
}

router.post('/setup', auth, async (req, res) => {
  try {
    const user = queryOne('SELECT id, username, email FROM users WHERE id = ?', [req.userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const existing = queryOne('SELECT id FROM two_factor WHERE userId = ?', [req.userId]);
    if (existing) return res.status(409).json({ error: '2FA already enabled' });

    const totp = createTOTP('SocialSuite', user.username || user.email);
    const secret = totp.toString();

    const backupCodes = [];
    for (let i = 0; i < 8; i++) {
      backupCodes.push(Math.random().toString(36).substring(2, 8).toUpperCase());
    }

    run('INSERT INTO two_factor (userId, secret, backupCodes) VALUES (?, ?, ?)',
      [req.userId, secret, JSON.stringify(backupCodes)]);

    const qrDataUrl = await QRCode.toDataURL(totp.toString());

    res.json({
      secret,
      qrCode: qrDataUrl,
      backupCodes,
      message: 'Scan QR code with your authenticator app, then verify with /verify endpoint'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/verify', auth, (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const record = queryOne('SELECT * FROM two_factor WHERE userId = ?', [req.userId]);
    if (!record) return res.status(400).json({ error: '2FA not set up' });

    const totp = new OTPAuth.TOTP({
      issuer: 'SocialSuite',
      label: req.userId.toString(),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(record.secret)
    });

    const delta = totp.validate({ token, window: 1 });
    if (delta === null) {
      const backupCodes = JSON.parse(record.backupCodes);
      const idx = backupCodes.indexOf(token.toUpperCase());
      if (idx !== -1) {
        backupCodes.splice(idx, 1);
        run('UPDATE two_factor SET backupCodes = ? WHERE userId = ?',
          [JSON.stringify(backupCodes), req.userId]);
        return res.json({ verified: true, method: 'backup_code', remaining: backupCodes.length });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }

    run('UPDATE two_factor SET enabled = 1 WHERE userId = ?', [req.userId]);
    res.json({ verified: true, method: 'totp' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/disable', auth, (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required to disable 2FA' });

    const record = queryOne('SELECT * FROM two_factor WHERE userId = ? AND enabled = 1', [req.userId]);
    if (!record) return res.status(400).json({ error: '2FA not enabled' });

    const totp = new OTPAuth.TOTP({
      issuer: 'SocialSuite',
      label: req.userId.toString(),
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(record.secret)
    });

    const delta = totp.validate({ token, window: 1 });
    if (delta === null) return res.status(401).json({ error: 'Invalid token' });

    run('DELETE FROM two_factor WHERE userId = ?', [req.userId]);
    res.json({ disabled: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/status', auth, (req, res) => {
  const record = queryOne('SELECT enabled, createdAt FROM two_factor WHERE userId = ?', [req.userId]);
  res.json({
    enabled: record?.enabled === 1,
    configured: !!record,
    createdAt: record?.createdAt
  });
});

router.post('/regenerate-backup', auth, (req, res) => {
  try {
    const record = queryOne('SELECT * FROM two_factor WHERE userId = ? AND enabled = 1', [req.userId]);
    if (!record) return res.status(400).json({ error: '2FA not enabled' });

    const backupCodes = [];
    for (let i = 0; i < 8; i++) {
      backupCodes.push(Math.random().toString(36).substring(2, 8).toUpperCase());
    }

    run('UPDATE two_factor SET backupCodes = ? WHERE userId = ?',
      [JSON.stringify(backupCodes), req.userId]);

    res.json({ backupCodes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export function require2FA(req, res, next) {
  const record = queryOne('SELECT enabled FROM two_factor WHERE userId = ?', [req.userId]);
  if (record && record.enabled === 1 && !req.twofaVerified) {
    return res.status(403).json({ error: 'Two-factor authentication required', twofaRequired: true });
  }
  next();
}

export default router;
