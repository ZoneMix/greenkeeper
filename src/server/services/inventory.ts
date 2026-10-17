import type { InventoryCreateInput, InventoryUpdateInput } from '@/lib/domain/schemas';
import type { InventoryItem } from '@/lib/domain/types';
import type { Db } from '../db/types';
import { notFound } from '../http/errors';
import { deleteInventoryItem, insertInventoryItem, updateInventoryItem } from '../repositories/inventory';
import { requireProduct } from './guards';

export function addInventory(db: Db, input: InventoryCreateInput): InventoryItem {
  requireProduct(db, input.product_id);
  return insertInventoryItem(db, input);
}

export function patchInventory(db: Db, id: number, input: InventoryUpdateInput): InventoryItem {
  const updated = updateInventoryItem(db, id, input);
  if (!updated) throw notFound('Inventory item');
  return updated;
}

export function removeInventory(db: Db, id: number): { readonly deleted: true; readonly id: number } {
  if (!deleteInventoryItem(db, id)) throw notFound('Inventory item');
  return { deleted: true, id };
}
