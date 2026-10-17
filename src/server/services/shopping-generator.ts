import { addDays } from '@/lib/domain/dates';
import type { ShoppingGenerateInput } from '@/lib/domain/schemas';
import type { ShoppingGenerateResult, ShoppingItem, ShoppingPlanItem } from '@/lib/domain/types';
import type { Db } from '../db/types';
import { onHandByProduct } from '../repositories/inventory';
import { listProducts } from '../repositories/products';
import { getSettings } from '../repositories/settings';
import { deleteShoppingItem, insertShoppingItem, listShopping, updateShoppingItem } from '../repositories/shopping';
import { listTasks } from '../repositories/tasks';
import { planShopping } from './shopping-planner';

/** Overdue tasks this recent still count; older ones were probably done or dropped. */
export const OVERDUE_GRACE_DAYS = 14;

function itemKey(item: Pick<ShoppingItem, 'product_id' | 'custom_name'>): string {
  return item.product_id !== null ? `product:${item.product_id}` : `custom:${(item.custom_name ?? '').trim().toLowerCase()}`;
}

interface ApplyCounts {
  readonly created: number;
  readonly updated: number;
  readonly removed: number;
}

/**
 * Writes the plan into the list. Only unpurchased rows the generator created are
 * touched; manual rows and purchase history are never modified.
 */
function applyPlan(db: Db, items: ReadonlyArray<ShoppingPlanItem>): ApplyCounts {
  const generated = listShopping(db, { purchased: false }).filter((item) => item.source === 'generated');
  const existingByKey = new Map(generated.map((item) => [itemKey(item), item]));
  const wanted = items.filter((item) => item.quantity_needed > 0);
  const wantedKeys = new Set(wanted.map((item) => item.key));
  let created = 0;
  let updated = 0;

  for (const item of wanted) {
    const existing = existingByKey.get(item.key);
    if (existing) {
      updateShoppingItem(db, existing.id, { quantity_needed: item.quantity_needed, notes: item.reason });
      updated += 1;
    } else {
      insertShoppingItem(
        db,
        {
          product_id: item.product_id,
          custom_name: item.custom_name,
          quantity_needed: item.quantity_needed,
          unit: item.unit,
          notes: item.reason,
        },
        'generated',
      );
      created += 1;
    }
  }

  const stale = generated.filter((item) => !wantedKeys.has(itemKey(item)));
  for (const item of stale) deleteShoppingItem(db, item.id);

  return { created, updated, removed: stale.length };
}

function summary(counts: ApplyCounts, dryRun: boolean, toBuy: number): string {
  if (dryRun) return `Preview: ${toBuy} item(s) to buy for upcoming tasks`;
  if (toBuy === 0 && counts.removed === 0) return 'Nothing to buy: upcoming tasks are covered by what you have';
  return `Shopping list updated: ${counts.created} added, ${counts.updated} updated, ${counts.removed} removed`;
}

export function generateShoppingList(db: Db, input: ShoppingGenerateInput, today: string): ShoppingGenerateResult {
  const from = addDays(today, -OVERDUE_GRACE_DAYS);
  const to = addDays(today, input.horizon_days);

  return db.transaction((): ShoppingGenerateResult => {
    const plan = planShopping({
      from,
      to,
      tasks: listTasks(db, { status: 'pending', from, to }),
      products: listProducts(db),
      settings: getSettings(db),
      onHand: onHandByProduct(db),
      openItems: listShopping(db, { purchased: false }),
    });
    const counts = input.dry_run ? { created: 0, updated: 0, removed: 0 } : applyPlan(db, plan.items);
    const toBuy = plan.items.filter((item) => item.quantity_needed > 0).length;
    return { ...plan, ...counts, dry_run: input.dry_run, message: summary(counts, input.dry_run, toBuy) };
  })();
}
