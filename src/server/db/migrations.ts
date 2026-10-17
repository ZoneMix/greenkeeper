// Versioned, additive-only schema migrations.
//
// Rules: never drop or rename a table or column; never rewrite user rows except to
// backfill a new column. Versions 1-3 reproduce the pre-revamp schema with
// IF NOT EXISTS / column checks, so a database created by the old app (which had no
// migrations table) is adopted in place without touching its data.

import { YARD } from '@/lib/domain/yard-config';
import type { Db } from './types';

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly up: (db: Db) => void;
}

function columnNames(db: Db, table: string): ReadonlySet<string> {
  const rows = db.prepare(`SELECT name FROM pragma_table_info(?)`).all(table) as ReadonlyArray<{ name: string }>;
  return new Set(rows.map((row) => row.name));
}

function addColumnIfMissing(db: Db, table: string, column: string, definition: string): void {
  if (!columnNames(db, table).has(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

const coreTables: Migration = {
  version: 1,
  name: 'core_tables',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        brand TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN (
          'fertilizer', 'weed-control', 'seed', 'soil-amendment', 'tool', 'other'
        )),
        coverage_sqft INTEGER,
        kid_safe INTEGER NOT NULL DEFAULT 0,
        organic INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        url TEXT
      );

      CREATE TABLE IF NOT EXISTS schedule_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL CHECK (category IN (
          'fertilizer', 'weed-control', 'mowing', 'aeration',
          'overseeding', 'soil-test', 'cleanup', 'watering'
        )),
        scheduled_date TEXT NOT NULL,
        completed_date TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
          'pending', 'completed', 'skipped'
        )),
        notes TEXT,
        product_id INTEGER REFERENCES products(id),
        zone TEXT NOT NULL DEFAULT 'both' CHECK (zone IN ('front', 'back', 'both')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity REAL NOT NULL DEFAULT 0,
        unit TEXT NOT NULL,
        purchased_date TEXT,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS shopping_list (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER REFERENCES products(id),
        custom_name TEXT,
        quantity_needed REAL NOT NULL DEFAULT 1,
        unit TEXT NOT NULL,
        purchased INTEGER NOT NULL DEFAULT 0,
        notes TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_date ON schedule_tasks(scheduled_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON schedule_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_category ON schedule_tasks(category);
      CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
      CREATE INDEX IF NOT EXISTS idx_shopping_product ON shopping_list(product_id);
    `);
  },
};

const MOWER_COLUMNS = ['mower_brand', 'mower_model'] as const;

/** The first settings row, taken from the yard config. */
function initialSettings(): Readonly<Record<string, string | number | null>> {
  return {
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
}

const lawnSettings: Migration = {
  version: 2,
  name: 'lawn_settings',
  up: (db) => {
    // Neutral DEFAULTs: the real values come from the yard config row inserted below.
    db.exec(`
      CREATE TABLE IF NOT EXISTS lawn_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        total_sqft INTEGER NOT NULL DEFAULT 0,
        front_sqft INTEGER NOT NULL DEFAULT 0,
        back_sqft INTEGER NOT NULL DEFAULT 0,
        shade_percentage INTEGER NOT NULL DEFAULT 0,
        spreader_model TEXT,
        city TEXT NOT NULL DEFAULT '',
        state TEXT NOT NULL DEFAULT '',
        usda_zone TEXT NOT NULL DEFAULT '',
        latitude REAL NOT NULL DEFAULT 0,
        longitude REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    const existing = columnNames(db, 'lawn_settings');
    const added = MOWER_COLUMNS.filter((column) => !existing.has(column));
    for (const column of added) addColumnIfMissing(db, 'lawn_settings', column, 'TEXT');

    // Never overwrites an existing row.
    const settings = initialSettings();
    const columns = Object.keys(settings);
    db.prepare(
      `INSERT OR IGNORE INTO lawn_settings (id, ${columns.join(', ')}) VALUES (1, ${columns.map((c) => `@${c}`).join(', ')})`,
    ).run(settings);

    // An older row that just gained the mower columns gets the yard's equipment; a NULL
    // the owner chose in a column that already existed is left alone.
    for (const column of added) {
      db.prepare(`UPDATE lawn_settings SET ${column} = ? WHERE ${column} IS NULL`).run(settings[column] ?? null);
    }
  },
};

const productToolType: Migration = {
  version: 3,
  name: 'product_tool_type',
  up: (db) => {
    addColumnIfMissing(db, 'products', 'tool_type', 'TEXT');
    db.exec(`
      UPDATE products SET tool_type = CASE
        WHEN name LIKE '%Trimmer%' THEN 'trimmer'
        WHEN name LIKE '%Leaf Rake%' OR name LIKE '%Thatch Rake%' OR name LIKE '%Leveling Rake%' THEN 'rake'
        WHEN name LIKE '%Shovel%' THEN 'shovel'
        WHEN name LIKE '%Sprinkler%' OR name LIKE '%Sprayer%' THEN 'sprayer'
        WHEN name LIKE '%Rain Gauge%' OR name LIKE '%Measuring%' OR name LIKE '%Level%' OR name LIKE '%Soil Test%' THEN 'gauge'
        WHEN name LIKE '%Sharpener%' OR name LIKE '%Balancer%' THEN 'sharpening'
        WHEN name LIKE '%Cart%' THEN 'hauling'
        WHEN name LIKE '%Aerator%' OR name LIKE '%Edger%' OR name LIKE '%Weed Puller%' OR name LIKE '%Cultivator%' OR name LIKE '%Fiskars%' THEN 'hand-tool'
        WHEN name LIKE '%Lawn Rake%' THEN 'rake'
        ELSE 'other'
      END
      WHERE category = 'tool' AND tool_type IS NULL
    `);
  },
};

const appMeta: Migration = {
  version: 4,
  name: 'app_meta',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  },
};

const shoppingSource: Migration = {
  version: 5,
  name: 'shopping_list_source',
  up: (db) => {
    // Existing rows were all added by hand or by the old generator; 'manual' is the
    // safe default because the new generator never edits manual rows.
    addColumnIfMissing(
      db,
      'shopping_list',
      'source',
      "TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'generated'))",
    );
    db.exec('CREATE INDEX IF NOT EXISTS idx_shopping_source ON shopping_list(source, purchased)');
  },
};

const weatherCache: Migration = {
  version: 6,
  name: 'weather_cache',
  up: (db) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS weather_cache (
        cache_key TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        fetched_at INTEGER NOT NULL
      );
    `);
  },
};

const shoppingInventoryLink: Migration = {
  version: 7,
  name: 'shopping_list_inventory_link',
  up: (db) => {
    // Set when buying a row stocked inventory, so it is stocked once and can be undone.
    addColumnIfMissing(db, 'shopping_list', 'inventory_id', 'INTEGER REFERENCES inventory(id) ON DELETE SET NULL');
  },
};

export const MIGRATIONS: ReadonlyArray<Migration> = [
  coreTables,
  lawnSettings,
  productToolType,
  appMeta,
  shoppingSource,
  weatherCache,
  shoppingInventoryLink,
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS.reduce((max, m) => Math.max(max, m.version), 0);
