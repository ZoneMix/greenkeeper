// A database seeded by an older catalog keeps its product names; the yard config's
// product_aliases lets the season planner still find those rows. The names here are
// made up: aliases come from the owner's own config.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { catalogNames } from '@/server/catalog/products';
import { connect } from '@/server/db/connection';
import { migrate } from '@/server/db/migrate';
import type { Db } from '@/server/db/types';
import { insertProduct, listProducts } from '@/server/repositories/products';
import { listTasks } from '@/server/repositories/tasks';
import { planSeason } from '@/server/services/season-planner';
import { seedDatabase } from '@/server/services/seed';

const { OLD_SOIL_KIT, EXTRA_PRODUCT } = vi.hoisted(() => ({
  OLD_SOIL_KIT: 'Soil Kit (Imaginary Valley Lab)',
  EXTRA_PRODUCT: {
    name: 'Imaginary Kelp Meal',
    brand: 'Made Up Co',
    category: 'soil-amendment',
    coverage_sqft: 1500,
    notes: 'Test-only product from the yard config.',
    url: null,
    tool_type: null,
  },
}));

vi.mock('@yard-config', async (importOriginal) => {
  const original = (await importOriginal<{ default: Record<string, unknown> }>()).default;
  return {
    default: {
      ...original,
      soil_lab: { name: 'Imaginary Valley Lab', url: 'https://soil.example.org/' },
      extra_products: [EXTRA_PRODUCT],
      product_aliases: { soilTest: [OLD_SOIL_KIT] },
    },
  };
});

let db: Db;
afterEach(() => db.close());

function freshDb(): Db {
  db = connect(':memory:');
  migrate(db);
  return db;
}

describe('product_aliases', () => {
  it('links template tasks to a product stored under an alias', () => {
    freshDb();
    const old = insertProduct(db, {
      name: OLD_SOIL_KIT,
      brand: 'Imaginary Valley Lab',
      category: 'tool',
      coverage_sqft: null,
      organic: true,
      kid_safe: true,
      notes: null,
      url: null,
      tool_type: 'gauge',
    });
    planSeason(db, 2028);
    const soilTest = listTasks(db).find((task) => task.category === 'soil-test');
    expect(soilTest?.product_id).toBe(old.id);
    expect(soilTest?.title).toContain('Imaginary Valley Lab');
  });

  it('lists the catalog name first, then its aliases', () => {
    expect(catalogNames('soilTest')).toEqual(['Soil Test Kit (Cooperative Extension)', OLD_SOIL_KIT]);
    expect(catalogNames('lime')).toEqual(['Pelletized Lime']);
  });
});

describe('seeded catalog', () => {
  it('appends extra_products and points the soil test at the configured lab', () => {
    freshDb();
    seedDatabase(db, '2027-02-10');
    const products = listProducts(db);
    expect(products.find((p) => p.name === EXTRA_PRODUCT.name)).toMatchObject({ organic: true, kid_safe: true });
    expect(products.find((p) => p.name === 'Soil Test Kit (Cooperative Extension)')).toMatchObject({
      url: 'https://soil.example.org/',
      notes: expect.stringContaining('Imaginary Valley Lab'),
    });
  });
});
