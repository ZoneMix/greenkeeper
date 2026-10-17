import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Product, ScheduleTask } from '@/lib/domain/types';
import { connect } from '@/server/db/connection';
import { migrate } from '@/server/db/migrate';
import type { Db } from '@/server/db/types';
import { insertInventoryItem, listInventory } from '@/server/repositories/inventory';
import { listShopping, insertShoppingItem, updateShoppingItem } from '@/server/repositories/shopping';
import { patchShoppingItem } from '@/server/services/shopping';
import { generateShoppingList } from '@/server/services/shopping-generator';
import { planShopping, type PlanInput } from '@/server/services/shopping-planner';
import { CORE_AERATOR_RENTAL, needsFor } from '@/server/services/shopping-rules';

const SETTINGS = { front_sqft: 4000, back_sqft: 6000, total_sqft: 10000 };

function product(overrides: Partial<Product> & Pick<Product, 'id' | 'name' | 'category'>): Product {
  return { brand: 'Brand', coverage_sqft: null, kid_safe: true, organic: true, notes: null, url: null, tool_type: null, ...overrides };
}

function task(overrides: Partial<ScheduleTask> & Pick<ScheduleTask, 'id' | 'title' | 'category'>): ScheduleTask {
  return {
    description: '',
    scheduled_date: '2027-05-03',
    completed_date: null,
    status: 'pending',
    notes: null,
    product_id: null,
    zone: 'both',
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

const MILORGANITE = product({ id: 1, name: 'Milorganite', category: 'fertilizer', coverage_sqft: 2500 });
const ESPOMA = product({ id: 2, name: 'Espoma Lawn Food', category: 'fertilizer', coverage_sqft: 5000 });
const WINTERIZER = product({ id: 3, name: 'Espoma Organic Winterizer', category: 'fertilizer', coverage_sqft: 5000 });
const SYNTHETIC = product({ id: 4, name: 'Synthetic Weed & Feed', category: 'fertilizer', coverage_sqft: 15000, organic: false });
const CORN_GLUTEN = product({ id: 5, name: 'Corn Gluten Meal Pre-Emergent', category: 'weed-control', coverage_sqft: 2000 });
const GRASS_SEED = product({ id: 6, name: 'Sun & Shade Seed', category: 'seed', coverage_sqft: 2300 });
const CLOVER = product({ id: 7, name: 'White Clover Seed', category: 'seed', coverage_sqft: 4000 });
const COMPOST = product({ id: 8, name: 'Compost / Top Dressing', category: 'soil-amendment' });
const LIME = product({ id: 9, name: 'Pelletized Lime', category: 'soil-amendment', coverage_sqft: 1000 });
const CATALOG = [MILORGANITE, ESPOMA, WINTERIZER, SYNTHETIC, CORN_GLUTEN, GRASS_SEED, CLOVER, COMPOST, LIME];

function plan(tasks: ReadonlyArray<ScheduleTask>, overrides: Partial<PlanInput> = {}) {
  return planShopping({
    from: '2027-04-01',
    to: '2027-11-10',
    tasks,
    products: CATALOG,
    settings: SETTINGS,
    onHand: [],
    openItems: [],
    ...overrides,
  });
}

describe('shopping rules', () => {
  it('maps categories to needs', () => {
    expect(needsFor(task({ id: 1, title: 'Mow', category: 'mowing' })).products).toEqual([]);
    expect(needsFor(task({ id: 1, title: 'Core aeration', category: 'aeration' })).custom[0]?.name).toBe(CORE_AERATOR_RENTAL);
    expect(needsFor(task({ id: 1, title: 'Mid-summer fertilizer (light application)', category: 'fertilizer' })).products[0]?.rate).toBe(0.5);
  });
});

describe('planShopping', () => {
  it('uses the linked product and sizes it by zone area and coverage', () => {
    const result = plan([task({ id: 1, title: 'Spring fertilizer', category: 'fertilizer', product_id: 1 })]);
    expect(result.items).toEqual([expect.objectContaining({ product_id: 1, required: 4, quantity_needed: 4, unit: 'bag' })]);
  });

  it('subtracts package stock on hand and manual list items', () => {
    const result = plan([task({ id: 1, title: 'Spring fertilizer', category: 'fertilizer', product_id: 1 })], {
      onHand: [
        { product_id: 1, unit: 'bag', quantity: 1 },
        { product_id: 1, unit: 'lb', quantity: 10 },
      ],
      openItems: [
        { id: 9, product_id: 1, custom_name: null, quantity_needed: 2, unit: 'bag', purchased: false, notes: null, source: 'manual', inventory_id: null, product: MILORGANITE },
      ],
    });
    const item = result.items[0];
    expect(item).toMatchObject({ required: 4, on_hand: 1, already_listed: 2, quantity_needed: 1 });
    expect(item?.reason).toMatch(/lb\/oz\/gal not counted/);
  });

  it('never recommends a product that is not organic and kid/pet-safe', () => {
    const result = plan([task({ id: 1, title: 'Fall fertilizer', category: 'fertilizer', product_id: SYNTHETIC.id })]);
    expect(result.items.map((i) => i.product_id)).not.toContain(SYNTHETIC.id);
    expect(result.items[0]?.product_id).toBe(ESPOMA.id);
    expect(result.warnings[0]).toMatch(/not organic and kid\/pet-safe; planned/);
  });

  it('picks winterizer and lime by task title, and halves light feedings', () => {
    const result = plan([
      task({ id: 1, title: 'Winterizer fertilizer', category: 'fertilizer' }),
      task({ id: 2, title: 'Apply lime if soil test indicated low pH', category: 'fertilizer', zone: 'front' }),
      task({ id: 3, title: 'Mid-summer fertilizer (light application)', category: 'fertilizer', product_id: 1 }),
    ]);
    const byId = new Map(result.items.map((i) => [i.product_id, i]));
    expect(byId.get(WINTERIZER.id)?.required).toBe(2);
    expect(byId.get(LIME.id)?.required).toBe(4);
    expect(byId.get(LIME.id)?.reason).toMatch(/only if the task applies/);
    expect(byId.get(MILORGANITE.id)?.required).toBe(2);
  });

  it('prefers a product already in stock over a bigger bag', () => {
    const result = plan([task({ id: 1, title: 'Fall fertilizer', category: 'fertilizer' })], {
      onHand: [{ product_id: MILORGANITE.id, unit: 'bag', quantity: 1 }],
    });
    expect(result.items[0]?.product_id).toBe(MILORGANITE.id);
  });

  it('only buys pre-emergent for pre-emergent tasks, and nothing for hand weeding', () => {
    const result = plan([
      task({ id: 1, title: 'Apply pre-emergent (corn gluten meal)', category: 'weed-control', scheduled_date: '2027-04-07' }),
      task({ id: 2, title: 'Spot-treat broadleaf weeds', category: 'weed-control' }),
    ]);
    expect(result.items.map((i) => i.product_id)).toEqual([CORN_GLUTEN.id]);
    expect(result.items[0]?.required).toBe(5);
  });

  it('plans grass seed, clover and compost for a fall overseed, and a quarter area for spot seeding', () => {
    const fall = plan([
      task({ id: 1, title: 'Heavy overseed after aeration', category: 'overseeding', description: 'white clover and compost top dressing' }),
    ]);
    expect(fall.items.map((i) => i.product_id).sort()).toEqual([GRASS_SEED.id, CLOVER.id, COMPOST.id].sort());
    expect(fall.items.find((i) => i.product_id === GRASS_SEED.id)?.required).toBe(5);

    const spring = plan([task({ id: 2, title: 'Overseed bare and thin spots', category: 'overseeding' })]);
    expect(spring.items[0]).toMatchObject({ product_id: GRASS_SEED.id, required: 2 });
  });

  it('adds rentals as custom items and aggregates the same product across tasks', () => {
    const result = plan([
      task({ id: 1, title: 'Core aeration', category: 'aeration' }),
      task({ id: 2, title: 'Spring fertilizer', category: 'fertilizer', product_id: 1, zone: 'front' }),
      task({ id: 3, title: 'Fall fertilizer', category: 'fertilizer', product_id: 1, zone: 'back' }),
    ]);
    expect(result.items.find((i) => i.custom_name === CORE_AERATOR_RENTAL)).toMatchObject({ quantity_needed: 1, unit: 'each' });
    expect(result.items.find((i) => i.product_id === 1)).toMatchObject({ required: 4 });
  });

  it('warns when the catalog has no safe product for a need', () => {
    const result = plan([task({ id: 1, title: 'Spring fertilizer', category: 'fertilizer' })], { products: [SYNTHETIC] });
    expect(result.items).toEqual([]);
    expect(result.warnings[0]).toMatch(/No organic, kid\/pet-safe fertilizer/);
  });
});

describe('generateShoppingList (database)', () => {
  let db: Db;
  const TODAY = '2027-04-25';

  beforeEach(() => {
    db = connect(':memory:');
    migrate(db);
    db.exec(`
      INSERT INTO products (id, name, brand, category, coverage_sqft, organic, kid_safe) VALUES
        (1, 'Milorganite', 'Milorganite', 'fertilizer', 2500, 1, 1),
        (2, 'Synthetic', 'X', 'fertilizer', 9000, 0, 1);
      INSERT INTO schedule_tasks (id, title, description, category, scheduled_date, zone, product_id, status) VALUES
        (1, 'Spring fertilizer application', '', 'fertilizer', '2027-05-03', 'both', 1, 'pending'),
        (2, 'Old overdue feed', '', 'fertilizer', '2027-03-01', 'both', 1, 'pending'),
        (3, 'Done feed', '', 'fertilizer', '2027-05-04', 'both', 1, 'completed'),
        (4, 'Core aeration', '', 'aeration', '2027-09-03', 'both', NULL, 'pending');
    `);
  });
  afterEach(() => db.close());

  it('writes generated rows within the horizon and is idempotent', () => {
    const first = generateShoppingList(db, { horizon_days: 30, dry_run: false }, TODAY);
    expect(first).toMatchObject({ created: 1, updated: 0, removed: 0 });
    const second = generateShoppingList(db, { horizon_days: 30, dry_run: false }, TODAY);
    expect(second).toMatchObject({ created: 0, updated: 1, removed: 0 });

    const rows = listShopping(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ product_id: 1, quantity_needed: 4, source: 'generated' });
  });

  it('respects inventory and removes generated rows that are no longer needed', () => {
    generateShoppingList(db, { horizon_days: 30, dry_run: false }, TODAY);
    insertInventoryItem(db, { product_id: 1, quantity: 4, unit: 'bag', purchased_date: null, notes: null });
    const result = generateShoppingList(db, { horizon_days: 30, dry_run: false }, TODAY);
    expect(result.removed).toBe(1);
    expect(listShopping(db)).toHaveLength(0);
  });

  it('never edits manual or purchased rows', () => {
    const manual = insertShoppingItem(db, { product_id: null, custom_name: 'Twine', quantity_needed: 1, unit: 'each', notes: 'mine' });
    generateShoppingList(db, { horizon_days: 30, dry_run: false }, TODAY);
    const generated = listShopping(db).find((row) => row.source === 'generated');
    updateShoppingItem(db, generated?.id ?? 0, { purchased: true });
    generateShoppingList(db, { horizon_days: 30, dry_run: false }, TODAY);

    const rows = listShopping(db);
    expect(rows.find((row) => row.id === manual.id)).toMatchObject({ notes: 'mine', quantity_needed: 1 });
    expect(rows.filter((row) => row.purchased)).toHaveLength(1);
  });

  it('buying a suggestion stocks it once, so the next run does not buy it again', () => {
    generateShoppingList(db, { horizon_days: 30, dry_run: false }, TODAY);
    const row = listShopping(db)[0];
    const id = row?.id ?? 0;

    patchShoppingItem(db, id, { purchased: true }, TODAY);
    patchShoppingItem(db, id, { purchased: true }, TODAY); // repeat click
    expect(listInventory(db)).toEqual([expect.objectContaining({ product_id: 1, quantity: 4, unit: 'bag' })]);

    const rerun = generateShoppingList(db, { horizon_days: 30, dry_run: false }, TODAY);
    expect(rerun.created).toBe(0);
    expect(listShopping(db, { purchased: false })).toHaveLength(0);
  });

  it('un-buying removes the stock it added unless it was edited', () => {
    generateShoppingList(db, { horizon_days: 30, dry_run: false }, TODAY);
    const id = listShopping(db)[0]?.id ?? 0;
    patchShoppingItem(db, id, { purchased: true }, TODAY);
    patchShoppingItem(db, id, { purchased: false }, TODAY);
    expect(listInventory(db)).toHaveLength(0);

    const bought = patchShoppingItem(db, id, { purchased: true }, TODAY);
    db.prepare('UPDATE inventory SET quantity = 3 WHERE id = ?').run(bought.inventory_id);
    const reopened = patchShoppingItem(db, id, { purchased: false }, TODAY);
    expect(reopened.inventory_id).toBeNull();
    expect(listInventory(db)).toEqual([expect.objectContaining({ quantity: 3 })]);
  });

  it('dry run changes nothing', () => {
    const result = generateShoppingList(db, { horizon_days: 180, dry_run: true }, TODAY);
    expect(result.items.length).toBe(2);
    expect(listShopping(db)).toHaveLength(0);
  });
});
