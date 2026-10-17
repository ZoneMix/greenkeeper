import type { InventoryCreateInput, InventoryUpdateInput } from '@/lib/domain/schemas';
import type { InventoryItem } from '@/lib/domain/types';
import type { Db } from '../db/types';
import { PRODUCT_JOIN_COLUMNS, mapPrefixedProduct, type PrefixedProductColumns } from './products';

interface InventoryRow extends PrefixedProductColumns {
  readonly id: number;
  readonly product_id: number;
  readonly quantity: number;
  readonly unit: string;
  readonly purchased_date: string | null;
  readonly notes: string | null;
}

const SELECT_INVENTORY = `
  SELECT i.id, i.product_id, i.quantity, i.unit, i.purchased_date, i.notes, ${PRODUCT_JOIN_COLUMNS}
  FROM inventory i JOIN products p ON i.product_id = p.id`;

function mapInventory(row: InventoryRow): InventoryItem {
  const product = mapPrefixedProduct(row);
  if (!product) throw new Error(`Inventory ${row.id} references a missing product`);
  return {
    id: row.id,
    product_id: row.product_id,
    quantity: row.quantity,
    unit: row.unit,
    purchased_date: row.purchased_date,
    notes: row.notes,
    product,
  };
}

export function listInventory(db: Db): ReadonlyArray<InventoryItem> {
  const rows = db.prepare(`${SELECT_INVENTORY} ORDER BY p.name ASC, i.id ASC`).all() as ReadonlyArray<InventoryRow>;
  return rows.map(mapInventory);
}

export function findInventoryItem(db: Db, id: number): InventoryItem | null {
  const row = db.prepare(`${SELECT_INVENTORY} WHERE i.id = ?`).get(id) as InventoryRow | undefined;
  return row ? mapInventory(row) : null;
}

export function insertInventoryItem(db: Db, input: InventoryCreateInput): InventoryItem {
  const result = db
    .prepare(
      `INSERT INTO inventory (product_id, quantity, unit, purchased_date, notes)
       VALUES (@product_id, @quantity, @unit, @purchased_date, @notes)`,
    )
    .run(input);
  const created = findInventoryItem(db, Number(result.lastInsertRowid));
  if (!created) throw new Error('Inventory insert did not persist');
  return created;
}

export function updateInventoryItem(db: Db, id: number, patch: InventoryUpdateInput): InventoryItem | null {
  const keys = (['quantity', 'unit', 'purchased_date', 'notes'] as const).filter((key) => patch[key] !== undefined);
  if (keys.length > 0) {
    const assignments = keys.map((key) => `${key} = @${key}`).join(', ');
    const params = Object.fromEntries(keys.map((key) => [key, patch[key]]));
    db.prepare(`UPDATE inventory SET ${assignments} WHERE id = @id`).run({ ...params, id });
  }
  return findInventoryItem(db, id);
}

export function deleteInventoryItem(db: Db, id: number): boolean {
  return db.prepare('DELETE FROM inventory WHERE id = ?').run(id).changes > 0;
}

export function countInventory(db: Db): number {
  const row = db.prepare('SELECT COUNT(*) AS count FROM inventory').get() as { count: number };
  return row.count;
}

export interface OnHand {
  readonly product_id: number;
  readonly unit: string;
  readonly quantity: number;
}

/** Quantity on hand per product and unit. */
export function onHandByProduct(db: Db): ReadonlyArray<OnHand> {
  return db
    .prepare(
      `SELECT product_id, unit, SUM(quantity) AS quantity
       FROM inventory GROUP BY product_id, unit HAVING SUM(quantity) > 0`,
    )
    .all() as ReadonlyArray<OnHand>;
}
