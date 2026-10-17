import { planningYear } from '@/lib/domain/season';
import { PRODUCT_CATALOG } from '../catalog/products';
import type { Db } from '../db/types';
import { getMeta, setMeta } from '../repositories/meta';
import { insertProduct } from '../repositories/products';
import { planSeason } from './season-planner';

const SEED_MARKER = 'seed_version';
const SEED_VERSION = '2';
const USER_TABLES = ['products', 'schedule_tasks', 'inventory', 'shopping_list'] as const;

export type SeedOutcome = 'seeded' | 'adopted-existing' | 'already-seeded';

function hasAnyRows(db: Db): boolean {
  return USER_TABLES.some((table) => {
    const row = db.prepare(`SELECT EXISTS (SELECT 1 FROM ${table}) AS present`).get() as { present: number };
    return row.present === 1;
  });
}

/**
 * Seeds a brand-new database once. A database that already holds any user rows (for
 * example one created by the pre-revamp app) is only marked as seeded: nothing is
 * inserted, so existing data is never duplicated. After that the seed never runs again,
 * even if the user deletes everything.
 */
export function seedDatabase(db: Db, today: string): SeedOutcome {
  if (getMeta(db, SEED_MARKER) !== null) return 'already-seeded';

  return db.transaction((): SeedOutcome => {
    // Re-check under the write lock in case another process seeded first.
    if (getMeta(db, SEED_MARKER) !== null) return 'already-seeded';
    if (hasAnyRows(db)) {
      setMeta(db, SEED_MARKER, SEED_VERSION);
      return 'adopted-existing';
    }
    for (const product of PRODUCT_CATALOG) {
      insertProduct(db, { ...product, organic: true, kid_safe: true });
    }
    // Work already in the past would only show up as overdue on day one.
    planSeason(db, planningYear(today), { notBefore: today });
    setMeta(db, SEED_MARKER, SEED_VERSION);
    return 'seeded';
  }).immediate();
}
