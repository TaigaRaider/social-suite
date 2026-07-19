let migrations = [];

export function registerMigration(id, name, up) {
  migrations.push({ id, name, up });
}

export function runMigrations(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT DEFAULT (datetime('now'))
  )`);

  const applied = db.exec('SELECT id FROM _migrations');
  const appliedIds = applied.length > 0 ? applied[0].values.map(r => r[0]) : [];

  const pending = migrations.filter(m => !appliedIds.includes(m.id));
  if (pending.length === 0) return;

  const sorted = pending.sort((a, b) => a.id - b.id);
  for (const migration of sorted) {
    try {
      migration.up(db);
      db.run('INSERT INTO _migrations (id, name) VALUES (?, ?)', [migration.id, migration.name]);
    } catch (err) {
      console.error(`[MIGRATION] Failed: ${migration.name} (${err.message})`);
    }
  }
}
