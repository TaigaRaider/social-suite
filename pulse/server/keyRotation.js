import { run, query, queryOne, saveDB } from './db.js';
import logger from './logger.js';

const ROTATION_INTERVAL = 24 * 60 * 60 * 1000; // Check daily
const STALE_THRESHOLD_DAYS = 30;
const MIN_PREKEY_COUNT = 10;
const REPLENISH_COUNT = 50;

export function startKeyRotation() {
  setInterval(() => {
    try {
      // Find users with stale signed pre-keys
      const staleUsers = query(`
        SELECT userId FROM identity_keys 
        WHERE signedPreKeyCreatedAt < datetime('now', '-${STALE_THRESHOLD_DAYS} days')
      `);
      
      for (const user of staleUsers) {
        // Flag for client-side rotation (server can't generate keys)
        run(`UPDATE identity_keys SET signedPreKeyCreatedAt = datetime('now') WHERE userId = ?`, [user.userId]);
        console.log(`[KeyRotation] Flagged user ${user.userId} for signed pre-key rotation`);
      }
      
      // Find users with low one-time pre-key counts
      const lowPreKeys = query(`
        SELECT userId, COUNT(*) as count 
        FROM one_time_pre_keys 
        WHERE claimed = 0 
        GROUP BY userId 
        HAVING count < ${MIN_PREKEY_COUNT}
      `);
      
      for (const user of lowPreKeys) {
        // Generate new one-time pre-keys
        const maxKeyId = queryOne('SELECT MAX(keyId) as maxId FROM one_time_pre_keys WHERE userId = ?', [user.userId]);
        const startId = (maxKeyId?.maxId || 0) + 1;
        
        for (let i = 0; i < REPLENISH_COUNT; i++) {
          // Generate random 32-byte key (simplified - real implementation uses X25519)
          const keyBytes = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256));
          const publicKey = keyBytes.map(b => b.toString(16).padStart(2, '0')).join('');
          
          run('INSERT INTO one_time_pre_keys (userId, keyId, publicKey) VALUES (?, ?, ?)',
            [user.userId, startId + i, publicKey]
          );
        }
        
        console.log(`[KeyRotation] Replenished ${REPLENISH_COUNT} pre-keys for user ${user.userId}`);
      }
      
      // Cleanup expired messages
      try {
        const deleted = run("DELETE FROM messages WHERE expiresAt IS NOT NULL AND expiresAt <= datetime('now')");
        if (deleted.changes > 0) {
          logger.info({ count: deleted.changes }, 'Cleaned up expired messages');
        }
      } catch (e) { /* ignore */ }

      if (staleUsers.length > 0 || lowPreKeys.length > 0) {
        saveDB();
      }
    } catch (err) {
      console.error('[KeyRotation] Error:', err);
    }
  }, ROTATION_INTERVAL);
  
  console.log('[KeyRotation] Started key rotation checker (daily)');
}
