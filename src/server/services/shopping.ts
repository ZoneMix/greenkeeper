import { isUnit } from '@/lib/domain/constants';
import type { ShoppingCreateInput, ShoppingUpdateInput } from '@/lib/domain/schemas';
import type { ShoppingItem } from '@/lib/domain/types';
import type { Db } from '../db/types';
import { notFound } from '../http/errors';
import { deleteInventoryItem, findInventoryItem, insertInventoryItem } from '../repositories/inventory';
import {
  deleteShoppingItem,
  findShoppingItem,
  insertShoppingItem,
  setShoppingInventoryLink,
  updateShoppingItem,
} from '../repositories/shopping';
import { requireEligibleProduct } from './guards';

const STOCK_NOTE = 'Added from the shopping list';

export function addShoppingItem(db: Db, input: ShoppingCreateInput): ShoppingItem {
  if (input.product_id !== null) requireEligibleProduct(db, input.product_id);
  return insertShoppingItem(db, input, 'manual');
}

/** Buying a product row puts it on the shelf once; the link prevents double counting. */
function stockPurchase(db: Db, item: ShoppingItem, today: string): void {
  if (item.product_id === null || item.inventory_id !== null || !isUnit(item.unit)) return;
  const stocked = insertInventoryItem(db, {
    product_id: item.product_id,
    quantity: item.quantity_needed,
    unit: item.unit,
    purchased_date: today,
    notes: STOCK_NOTE,
  });
  setShoppingInventoryLink(db, item.id, stocked.id);
}

/** Un-buying removes the stock it added, unless that inventory row was edited since. */
function unstockPurchase(db: Db, item: ShoppingItem): void {
  if (item.inventory_id === null) return;
  const stocked = findInventoryItem(db, item.inventory_id);
  if (stocked && stocked.quantity === item.quantity_needed && stocked.unit === item.unit) {
    deleteInventoryItem(db, stocked.id);
  }
  setShoppingInventoryLink(db, item.id, null);
}

export function patchShoppingItem(db: Db, id: number, input: ShoppingUpdateInput, today: string): ShoppingItem {
  return db.transaction((): ShoppingItem => {
    const existing = findShoppingItem(db, id);
    if (!existing) throw notFound('Shopping item');
    const updated = updateShoppingItem(db, id, input);
    if (!updated) throw notFound('Shopping item');
    if (input.purchased === true && !existing.purchased) stockPurchase(db, updated, today);
    if (input.purchased === false && existing.purchased) unstockPurchase(db, existing);
    const result = findShoppingItem(db, id);
    if (!result) throw notFound('Shopping item');
    return result;
  })();
}

export function removeShoppingItem(db: Db, id: number): { readonly deleted: true; readonly id: number } {
  if (!deleteShoppingItem(db, id)) throw notFound('Shopping item');
  return { deleted: true, id };
}
