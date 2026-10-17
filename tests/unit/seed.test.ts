import { afterEach, describe, expect, it } from 'vitest';
import { addDays, isoFromParts } from '@/lib/domain/dates';
import { checkSchedule } from '@/lib/domain/schedule-rules';
import { seasonBounds } from '@/lib/domain/season';
import { SEASON_TEMPLATE } from '@/server/catalog/season-template';
import { connect } from '@/server/db/connection';
import { migrate } from '@/server/db/migrate';
import type { Db } from '@/server/db/types';
import { listProducts } from '@/server/repositories/products';
import { listTasks } from '@/server/repositories/tasks';
import { planSeason } from '@/server/services/season-planner';
import { seedDatabase } from '@/server/services/seed';

let db: Db;

// Middle template task date: some template work is already past, some still ahead.
const [midMonth, midDay] = SEASON_TEMPLATE[Math.floor(SEASON_TEMPLATE.length / 2)]?.monthDay.split('-').map(Number) ?? [];
const MID_SEASON = isoFromParts(2026, midMonth ?? 7, midDay ?? 1);
const AFTER_SEASON = addDays(seasonBounds(2026).end, 10);

function freshDb(): Db {
  db = connect(':memory:');
  migrate(db);
  return db;
}

afterEach(() => db.close());

describe('seedDatabase', () => {
  it('seeds a fresh database with safe products and the planning-year template', () => {
    freshDb();
    expect(seedDatabase(db, '2027-02-10')).toBe('seeded');

    const products = listProducts(db);
    expect(products.length).toBeGreaterThan(0);
    expect(products.every((p) => p.organic && p.kid_safe)).toBe(true);

    const tasks = listTasks(db);
    expect(tasks).toHaveLength(SEASON_TEMPLATE.length);
    expect(tasks.every((t) => t.scheduled_date.startsWith('2027-'))).toBe(true);
  });

  it('skips template tasks already in the past on a mid-season install', () => {
    freshDb();
    seedDatabase(db, MID_SEASON);
    const tasks = listTasks(db);
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.length).toBeLessThan(SEASON_TEMPLATE.length);
    expect(tasks.every((t) => t.scheduled_date >= MID_SEASON)).toBe(true);
  });

  it('plans next year once the season is over', () => {
    freshDb();
    seedDatabase(db, AFTER_SEASON);
    expect(listTasks(db)[0]?.scheduled_date.startsWith('2027-')).toBe(true);
  });

  it('runs once: repeated calls and emptied tables never re-seed', () => {
    freshDb();
    seedDatabase(db, '2027-02-10');
    const productCount = listProducts(db).length;
    expect(seedDatabase(db, '2027-02-10')).toBe('already-seeded');
    db.exec('DELETE FROM schedule_tasks; DELETE FROM products;');
    expect(seedDatabase(db, '2027-02-10')).toBe('already-seeded');
    expect(listProducts(db)).toHaveLength(0);
    expect(productCount).toBeGreaterThan(0);
  });

  it('adopts a database that already has rows without inserting anything', () => {
    freshDb();
    db.exec("INSERT INTO shopping_list (custom_name, unit) VALUES ('Twine', 'each')");
    expect(seedDatabase(db, '2027-02-10')).toBe('adopted-existing');
    expect(listProducts(db)).toHaveLength(0);
    expect(listTasks(db)).toHaveLength(0);
  });
});

describe('season template', () => {
  it('passes its own agronomy checks (no pre-emergent within 6 weeks of seeding, all in season)', () => {
    freshDb();
    seedDatabase(db, '2027-02-10');
    expect(checkSchedule(listTasks(db))).toEqual([]);
  });

  it('only links organic, kid/pet-safe products', () => {
    freshDb();
    seedDatabase(db, '2027-02-10');
    db.exec("UPDATE products SET organic = 0 WHERE name LIKE 'Milorganite%'");
    planSeason(db, 2028);
    const products = new Map(listProducts(db).map((p) => [p.id, p]));
    const linked = listTasks(db, { from: '2028-01-01' }).filter((t) => t.product_id !== null);
    expect(linked.length).toBeGreaterThan(0);
    for (const task of linked) {
      const product = products.get(task.product_id ?? -1);
      expect(product?.organic && product.kid_safe).toBe(true);
    }
  });

  it('planSeason is idempotent per year', () => {
    freshDb();
    const first = planSeason(db, 2028);
    const second = planSeason(db, 2028);
    expect(first.created).toHaveLength(SEASON_TEMPLATE.length);
    expect(second.created).toHaveLength(0);
    expect(second.skipped).toBe(SEASON_TEMPLATE.length);
  });
});
