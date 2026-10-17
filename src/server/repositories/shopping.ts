import type { ShoppingCreateInput, ShoppingUpdateInput } from '@/lib/domain/schemas';
import type { ShoppingItem, ShoppingSource } from '@/lib/domain/types';
import type { Db } from '../db/types';
import { PRODUCT_JOIN_COLUMNS, mapPrefixedProduct, type PrefixedProductColumns } from './products';

interface ShoppingRow extends PrefixedProductColumns {
  readonly id: number;
  readonly product_id: number | null;
  readonly custom_name: string | null;
  readonly quantity_needed: number;
  readonly unit: string;
  readonly purchased: number;
  readonly notes: string | null;
  readonly source: ShoppingSource;
  readonly inventory_id: number | null;
}

const SELECT_SHOPPING = `
  SELECT s.id, s.product_id, s.custom_name, s.quantity_needed, s.unit, s.purchased, s.notes, s.source, s.inventory_id,
    ${PRODUCT_JOIN_COLUMNS}
  FROM shopping_list s LEFT JOIN products p ON s.product_id = p.id`;

function mapShopping(row: ShoppingRow): ShoppingItem {
  return {
    id: row.id,
    product_id: row.product_id,
    custom_name: row.custom_name,
    quantity_needed: row.quantity_needed,
    unit: row.unit,
    purchased: row.purchased === 1,
    notes: row.notes,
    source: row.source,
    inventory_id: row.inventory_id,
    product: mapPrefixedProduct(row),
  };
}

export function listShopping(db: Db, filter: { readonly purchased?: boolean } = {}): ReadonlyArray<ShoppingItem> {
  const where = filter.purchased === undefined ? '' : 'WHERE s.purchased = @purchased';
  const rows = db
    .prepare(`${SELECT_SHOPPING} ${where} ORDER BY s.purchased ASC, COALESCE(p.name, s.custom_name) ASC, s.id ASC`)
    .all(filter.purchased === undefined ? {} : { purchased: filter.purchased ? 1 : 0 }) as ReadonlyArray<ShoppingRow>;
  return rows.map(mapShopping);
}

export function findShoppingItem(db: Db, id: number): ShoppingItem | null {
  const row = db.prepare(`${SELECT_SHOPPING} WHERE s.id = ?`).get(id) as ShoppingRow | undefined;
  return row ? mapShopping(row) : null;
}

export type NewShoppingRow = Omit<ShoppingCreateInput, 'unit'> & { readonly unit: string };

export function insertShoppingItem(
  db: Db,
  input: NewShoppingRow,
  source: ShoppingSource = 'manual',
): ShoppingItem {
  const result = db
    .prepare(
      `INSERT INTO shopping_list (product_id, custom_name, quantity_needed, unit, notes, source)
       VALUES (@product_id, @custom_name, @quantity_needed, @unit, @notes, @source)`,
    )
    .run({ ...input, source });
  const created = findShoppingItem(db, Number(result.lastInsertRowid));
  if (!created) throw new Error('Shopping insert did not persist');
  return created;
}

export function updateShoppingItem(db: Db, id: number, patch: ShoppingUpdateInput): ShoppingItem | null {
  const keys = (['quantity_needed', 'unit', 'purchased', 'notes'] as const).filter((key) => patch[key] !== undefined);
  if (keys.length > 0) {
    const assignments = keys.map((key) => `${key} = @${key}`).join(', ');
    const params = Object.fromEntries(
      keys.map((key) => [key, key === 'purchased' ? (patch.purchased ? 1 : 0) : patch[key]]),
    );
    db.prepare(`UPDATE shopping_list SET ${assignments} WHERE id = @id`).run({ ...params, id });
  }
  return findShoppingItem(db, id);
}

export function deleteShoppingItem(db: Db, id: number): boolean {
  return db.prepare('DELETE FROM shopping_list WHERE id = ?').run(id).changes > 0;
}

export function countOpenShopping(db: Db): number {
  const row = db.prepare('SELECT COUNT(*) AS count FROM shopping_list WHERE purchased = 0').get() as { count: number };
  return row.count;
}

/** Records (or clears) the inventory row a purchase created. */
export function setShoppingInventoryLink(db: Db, id: number, inventoryId: number | null): void {
  db.prepare('UPDATE shopping_list SET inventory_id = ? WHERE id = ?').run(inventoryId, id);
}
