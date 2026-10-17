import fs from 'node:fs';
import path from 'node:path';
import { MIGRATIONS, type Migration } from './migrations';
import type { Db } from './types';

const MAX_BACKUPS = 5;
const BACKUP_PREFIX = 'lawn-pre-migration-';

export interface MigrationResult {
  readonly applied: ReadonlyArray<number>;
  readonly currentVersion: number;
  readonly backupPath: string | null;
}

export interface MigrateOptions {
  /** Where to write a pre-migration snapshot of an existing database. Null disables backups. */
  readonly backupDir?: string | null;
  readonly migrations?: ReadonlyArray<Migration>;
  readonly now?: Date;
}

function ensureMigrationsTable(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function appliedVersions(db: Db): ReadonlySet<number> {
  ensureMigrationsTable(db);
  const rows = db.prepare('SELECT version FROM schema_migrations').all() as ReadonlyArray<{ version: number }>;
  return new Set(rows.map((row) => row.version));
}

function hasUserData(db: Db): boolean {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS count FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != 'schema_migrations'`,
    )
    .get() as { count: number };
  return row.count > 0;
}

function pruneBackups(backupDir: string): void {
  const backups = fs
    .readdirSync(backupDir)
    .filter((file) => file.startsWith(BACKUP_PREFIX))
    .sort();
  for (const stale of backups.slice(0, Math.max(0, backups.length - MAX_BACKUPS))) {
    fs.rmSync(path.join(backupDir, stale));
  }
}

/** Writes a consistent snapshot with VACUUM INTO (safe while WAL is active). */
function backupDatabase(db: Db, backupDir: string, now: Date): string {
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const target = path.join(backupDir, `${BACKUP_PREFIX}${stamp}.db`);
  db.prepare('VACUUM INTO ?').run(target);
  pruneBackups(backupDir);
  return target;
}

/**
 * Applies pending migrations in order, each in its own transaction. When an existing
 * database needs upgrading, a snapshot is written first so a bad upgrade is reversible.
 */
export function migrate(db: Db, options: MigrateOptions = {}): MigrationResult {
  const migrations = [...(options.migrations ?? MIGRATIONS)].sort((a, b) => a.version - b.version);
  const hadData = hasUserData(db);
  const done = appliedVersions(db);
  const pending = migrations.filter((m) => !done.has(m.version));

  const backupPath =
    pending.length > 0 && hadData && options.backupDir
      ? backupDatabase(db, options.backupDir, options.now ?? new Date())
      : null;

  const record = db.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)');
  const isApplied = db.prepare('SELECT 1 FROM schema_migrations WHERE version = ?');
  const applied: number[] = [];
  for (const migration of pending) {
    // IMMEDIATE takes the write lock up front; the re-check makes a second process
    // starting at the same time skip work the first one already did.
    db.transaction(() => {
      if (isApplied.get(migration.version)) return;
      migration.up(db);
      record.run(migration.version, migration.name);
      applied.push(migration.version);
    }).immediate();
  }

  // A database written by a newer build keeps its higher version.
  const currentVersion = Math.max(0, ...done, ...pending.map((m) => m.version));
  db.pragma(`user_version = ${Math.trunc(currentVersion)}`);

  return { applied, currentVersion, backupPath };
}
