import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let backupInterval = null;

export function startBackup(dbPath, appName, intervalMs = 6 * 60 * 60 * 1000) {
  const backupsDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const runBackup = () => {
    try {
      if (!fs.existsSync(dbPath)) return;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupFile = path.join(backupsDir, `${appName}-backup-${timestamp}.db`);
      fs.copyFileSync(dbPath, backupFile);

      const files = fs.readdirSync(backupsDir)
        .filter(f => f.startsWith(`${appName}-backup-`) && f.endsWith('.db'))
        .sort()
        .reverse();
      while (files.length > 7) {
        const old = files.pop();
        fs.unlinkSync(path.join(backupsDir, old));
      }
    } catch (err) {
      console.error(`[BACKUP] Error: ${err.message}`);
    }
  };

  runBackup();
  backupInterval = setInterval(runBackup, intervalMs);
}

export function stopBackup() {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
  }
}
