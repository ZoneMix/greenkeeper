// Process-wide database handle. Opened lazily on first use so `next build` and module
// imports never touch the data file; migrations and the one-time seed run on open.

import { todayIso } from '@/lib/domain/dates';
import { loadConfig } from './config';
import { connect } from './db/connection';
import { migrate } from './db/migrate';
import type { Db } from './db/types';
import { logger } from './logger';
import { seedDatabase } from './services/seed';

let instance: Db | null = null;

export function openDatabase(dbPath: string, backupDir: string | null): Db {
  const db = connect(dbPath);
  try {
    const result = migrate(db, { backupDir });
    if (result.backupPath) {
      logger.warn(`Upgraded database schema to v${result.currentVersion}; backup at ${result.backupPath}`);
    }
    seedDatabase(db, todayIso());
    return db;
  } catch (error: unknown) {
    db.close();
    throw error;
  }
}

export function getDb(): Db {
  if (!instance) {
    const config = loadConfig();
    instance = openDatabase(config.dbPath, config.backupDir);
  }
  return instance;
}

/** Closes the shared handle (tests, graceful shutdown). The next getDb() reopens. */
export function closeDb(): void {
  instance?.close();
  instance = null;
}
