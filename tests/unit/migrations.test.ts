import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { YARD } from '@/lib/domain/yard-config';
import { openDatabase } from '@/server/database';
import { connect } from '@/server/db/connection';
import { migrate } from '@/server/db/migrate';
import { LATEST_SCHEMA_VERSION, MIGRATIONS } from '@/server/db/migrations';
import type { Db } from '@/server/db/types';
import { createLegacyDb, tableRows, tempDbPath } from '../helpers/legacy-db';

const LEGACY_TABLES = ['products', 'schedule_tasks', 'inventory', 'shopping_list'] as const;

const open: Db[] = [];
function track(db: Db): Db {
  open.push(db);
  return db;
}

afterEach(() => {
  for (const db of open.splice(0)) db.close();
});

function snapshot(dbPath: string): Record<string, ReadonlyArray<Record<string, unknown>>> {
  return Object.fromEntries(LEGACY_TABLES.map((table) => [table, tableRows(dbPath, table)]));
}

function columns(db: Db, table: string): ReadonlyArray<string> {
  return (db.prepare('SELECT name FROM pragma_table_info(?)').all(table) as ReadonlyArray<{ name: string }>).map(
    (row) => row.name,
  );
}

describe.each(['v0', 'main'] as const)('upgrading a %s database in place', (variant) => {
  it('keeps every existing row and column value', () => {
    const dbPath = tempDbPath();
    createLegacyDb(dbPath, variant);
    const before = snapshot(dbPath);

    const db = track(openDatabase(dbPath, path.join(path.dirname(dbPath), 'backups')));
    db.close();
    open.pop();

    const after = snapshot(dbPath);
    for (const table of LEGACY_TABLES) {
      expect(after[table]).toHaveLength(before[table]?.length ?? -1);
      after[table]?.forEach((row, index) => {
        // Additive only: every old column survives with its old value. The one allowed
        // change is backfilling a NULL tool_type, exactly as the old app did on boot.
        const { tool_type: oldToolType, ...old } = before[table]?.[index] ?? {};
        expect(row).toMatchObject(old);
        if (oldToolType !== null && oldToolType !== undefined) expect(row.tool_type).toBe(oldToolType);
      });
    }
  });

  it('adds the new columns and tables with safe defaults', () => {
    const dbPath = tempDbPath();
    createLegacyDb(dbPath, variant);
    const db = track(openDatabase(dbPath, null));

    expect(columns(db, 'products')).toContain('tool_type');
    expect(columns(db, 'shopping_list')).toEqual(expect.arrayContaining(['source', 'inventory_id']));
    expect(columns(db, 'lawn_settings')).toEqual(expect.arrayContaining(['mower_brand', 'mower_model']));
    const sources = db.prepare('SELECT DISTINCT source FROM shopping_list').all();
    expect(sources).toEqual([{ source: 'manual' }]);
    const trimmer = db.prepare('SELECT tool_type FROM products WHERE id = 3').get();
    expect(trimmer).toEqual({ tool_type: 'trimmer' });
    expect(db.pragma('user_version', { simple: true })).toBe(LATEST_SCHEMA_VERSION);
  });

  it('does not seed or duplicate anything into an existing database', () => {
    const dbPath = tempDbPath();
    createLegacyDb(dbPath, variant);
    track(openDatabase(dbPath, null)).close();
    open.pop();
    track(openDatabase(dbPath, null)).close();
    open.pop();

    expect(tableRows(dbPath, 'products')).toHaveLength(4);
    expect(tableRows(dbPath, 'schedule_tasks')).toHaveLength(3);
  });

  it('writes a pre-migration backup that still holds the old data', () => {
    const dbPath = tempDbPath();
    createLegacyDb(dbPath, variant);
    const backupDir = path.join(path.dirname(dbPath), 'backups');
    track(openDatabase(dbPath, backupDir));

    const backups = fs.readdirSync(backupDir);
    expect(backups).toHaveLength(1);
    const backupTasks = tableRows(path.join(backupDir, backups[0] ?? ''), 'schedule_tasks');
    expect(backupTasks).toHaveLength(3);
  });
});

function settingsRow(db: Db): Record<string, unknown> {
  return db.prepare('SELECT * FROM lawn_settings WHERE id = 1').get() as Record<string, unknown>;
}

const YARD_SETTINGS = {
  total_sqft: YARD.yard.total_sqft,
  front_sqft: YARD.yard.front_sqft,
  back_sqft: YARD.yard.back_sqft,
  shade_percentage: YARD.yard.shade_percentage,
  spreader_model: YARD.equipment.spreader_model,
  city: YARD.location.city,
  state: YARD.location.state,
  usda_zone: YARD.location.usda_zone,
  latitude: YARD.location.latitude,
  longitude: YARD.location.longitude,
  mower_brand: YARD.equipment.mower_brand,
  mower_model: YARD.equipment.mower_model,
};

describe('lawn_settings from the yard config', () => {
  it('creates the first settings row from the yard config on a fresh database', () => {
    const db = track(connect(':memory:'));
    migrate(db);
    expect(settingsRow(db)).toMatchObject(YARD_SETTINGS);
  });

  it('creates it from the yard config when upgrading a database that had no settings', () => {
    const dbPath = tempDbPath();
    createLegacyDb(dbPath, 'v0');
    expect(settingsRow(track(openDatabase(dbPath, null)))).toMatchObject(YARD_SETTINGS);
  });

  it('never overwrites an existing settings row', () => {
    const dbPath = tempDbPath();
    createLegacyDb(dbPath, 'main');
    const [before] = tableRows(dbPath, 'lawn_settings');
    const after = settingsRow(track(openDatabase(dbPath, null)));
    expect(after).toEqual(before);
    expect(after).toMatchObject({ city: 'Anytown', mower_brand: 'acme', total_sqft: 8000 });
  });

  it("keeps a NULL mower the owner chose in an existing column", () => {
    const dbPath = tempDbPath();
    createLegacyDb(dbPath, 'main');
    const legacy = track(connect(dbPath));
    legacy.exec('UPDATE lawn_settings SET mower_brand = NULL, mower_model = NULL');
    legacy.close();
    open.pop();
    expect(settingsRow(track(openDatabase(dbPath, null)))).toMatchObject({ mower_brand: null, mower_model: null });
  });

  it('fills newly added mower columns from the yard config, leaving the rest of the row alone', () => {
    const db = track(connect(':memory:'));
    // A settings table from before the mower columns existed.
    db.exec(`
      CREATE TABLE lawn_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        total_sqft INTEGER NOT NULL DEFAULT 0, front_sqft INTEGER NOT NULL DEFAULT 0,
        back_sqft INTEGER NOT NULL DEFAULT 0, shade_percentage INTEGER NOT NULL DEFAULT 0,
        spreader_model TEXT, city TEXT NOT NULL DEFAULT '', state TEXT NOT NULL DEFAULT '',
        usda_zone TEXT NOT NULL DEFAULT '', latitude REAL NOT NULL DEFAULT 0, longitude REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO lawn_settings (id, total_sqft, city, state) VALUES (1, 1234, 'Anytown', 'ZZ');
    `);
    migrate(db);
    expect(settingsRow(db)).toMatchObject({
      total_sqft: 1234,
      city: 'Anytown',
      state: 'ZZ',
      mower_brand: YARD.equipment.mower_brand,
      mower_model: YARD.equipment.mower_model,
    });
  });
});

describe('migrate()', () => {
  it('is idempotent: a second run applies nothing and makes no backup', () => {
    const dbPath = tempDbPath();
    const db = track(connect(dbPath));
    const first = migrate(db, { backupDir: null });
    expect(first.applied).toEqual(MIGRATIONS.map((m) => m.version));

    const second = migrate(db, { backupDir: path.join(path.dirname(dbPath), 'backups') });
    expect(second.applied).toEqual([]);
    expect(second.backupPath).toBeNull();
  });

  it('rolls back a failing migration and leaves earlier ones applied', () => {
    const db = track(connect(':memory:'));
    const broken = [
      ...MIGRATIONS.slice(0, 1),
      {
        version: 99,
        name: 'broken',
        up: (inner: Db) => {
          inner.exec('CREATE TABLE half_done (id INTEGER)');
          throw new Error('boom');
        },
      },
    ];
    expect(() => migrate(db, { migrations: broken })).toThrow('boom');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE name = 'half_done'").all();
    expect(tables).toEqual([]);
    expect(db.prepare('SELECT version FROM schema_migrations').all()).toEqual([{ version: 1 }]);
  });

  it('keeps only the five newest backups', () => {
    const dbPath = tempDbPath();
    const backupDir = path.join(path.dirname(dbPath), 'backups');
    for (let run = 0; run < 7; run += 1) {
      const db = track(connect(dbPath));
      db.exec('CREATE TABLE IF NOT EXISTS keep_me (id INTEGER)');
      db.exec('DROP TABLE IF EXISTS schema_migrations');
      migrate(db, { backupDir, now: new Date(Date.UTC(2026, 0, run + 1)) });
      db.close();
      open.pop();
    }
    expect(fs.readdirSync(backupDir)).toHaveLength(5);
  });
});
