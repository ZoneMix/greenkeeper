// Builds databases exactly as the pre-revamp app left them, so migrations can be
// tested against real old schemas instead of the new code's own output.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';

export function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'greenkeeper-test-'));
}

export function tempDbPath(): string {
  return path.join(tempDir(), 'lawn.db');
}

/** Oldest known shape: four core tables, no lawn_settings, no products.tool_type. */
const V0_SCHEMA = `
  CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('fertilizer', 'weed-control', 'seed', 'soil-amendment', 'tool', 'other')),
    coverage_sqft INTEGER,
    kid_safe INTEGER NOT NULL DEFAULT 0,
    organic INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    url TEXT
  );
  CREATE TABLE schedule_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('fertilizer', 'weed-control', 'mowing', 'aeration', 'overseeding', 'soil-test', 'cleanup', 'watering')),
    scheduled_date TEXT NOT NULL,
    completed_date TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
    notes TEXT,
    product_id INTEGER REFERENCES products(id),
    zone TEXT NOT NULL DEFAULT 'both' CHECK (zone IN ('front', 'back', 'both')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    purchased_date TEXT,
    notes TEXT
  );
  CREATE TABLE shopping_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER REFERENCES products(id),
    custom_name TEXT,
    quantity_needed REAL NOT NULL DEFAULT 1,
    unit TEXT NOT NULL,
    purchased INTEGER NOT NULL DEFAULT 0,
    notes TEXT
  );
  CREATE INDEX idx_tasks_date ON schedule_tasks(scheduled_date);
`;

/** main@cb58d9a shape: adds lawn_settings (with mower columns) and products.tool_type. */
const MAIN_EXTRAS = `
  ALTER TABLE products ADD COLUMN tool_type TEXT;
  CREATE TABLE lawn_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    total_sqft INTEGER NOT NULL DEFAULT 10000,
    front_sqft INTEGER NOT NULL DEFAULT 4000,
    back_sqft INTEGER NOT NULL DEFAULT 6000,
    shade_percentage INTEGER NOT NULL DEFAULT 50,
    spreader_model TEXT DEFAULT 'generic-broadcast',
    city TEXT NOT NULL DEFAULT 'Anytown',
    state TEXT NOT NULL DEFAULT 'ZZ',
    usda_zone TEXT NOT NULL DEFAULT '5a',
    latitude REAL NOT NULL DEFAULT 40.5,
    longitude REAL NOT NULL DEFAULT -90.5,
    mower_brand TEXT DEFAULT 'acme',
    mower_model TEXT DEFAULT 'acme-21',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  INSERT INTO lawn_settings (id, total_sqft, front_sqft, back_sqft) VALUES (1, 8000, 3000, 5000);
`;

const LEGACY_ROWS = `
  INSERT INTO products (id, name, brand, category, coverage_sqft, kid_safe, organic, notes, url) VALUES
    (1, 'Milorganite Organic Nitrogen Fertilizer', 'Milorganite', 'fertilizer', 2500, 1, 1, '32lb bag', NULL),
    (2, 'Scotts EZ Seed Patch & Repair', 'Scotts', 'seed', 225, 1, 0, '10lb bag', NULL),
    (3, 'Acme Cordless String Trimmer', 'Acme', 'tool', NULL, 1, 1, NULL, NULL),
    (4, 'Corn Gluten Meal Pre-Emergent', 'Various', 'weed-control', 2000, 1, 1, NULL, NULL);
  INSERT INTO schedule_tasks (id, title, description, category, scheduled_date, status, product_id, zone, notes) VALUES
    (1, 'Spring fertilizer application', 'Feed', 'fertilizer', '2026-05-03', 'completed', 1, 'both', 'went well'),
    (2, 'Fall fertilizer (most important of the year)', 'Feed', 'fertilizer', '2026-09-17', 'pending', 1, 'both', NULL),
    (3, 'Overseed bare and thin spots', 'Seed', 'overseeding', '2026-09-07', 'pending', 2, 'front', NULL);
  INSERT INTO inventory (id, product_id, quantity, unit, purchased_date, notes) VALUES
    (1, 1, 2, 'bag', '2026-04-01', 'garage shelf');
  INSERT INTO shopping_list (id, product_id, custom_name, quantity_needed, unit, purchased, notes) VALUES
    (1, NULL, 'Rain gauge', 1, 'each', 0, 'hand-added'),
    (2, 1, NULL, 3, 'bag', 1, NULL);
`;

export type LegacyVariant = 'v0' | 'main';

export function createLegacyDb(dbPath: string, variant: LegacyVariant): void {
  const db = new Database(dbPath);
  db.exec(V0_SCHEMA);
  if (variant === 'main') db.exec(MAIN_EXTRAS);
  db.exec(LEGACY_ROWS);
  db.close();
}

export function tableRows(dbPath: string, table: string): ReadonlyArray<Record<string, unknown>> {
  const db = new Database(dbPath, { readonly: true });
  try {
    return db.prepare(`SELECT * FROM ${table} ORDER BY id`).all() as ReadonlyArray<Record<string, unknown>>;
  } finally {
    db.close();
  }
}
