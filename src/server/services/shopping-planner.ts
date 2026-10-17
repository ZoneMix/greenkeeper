// Pure shopping plan: which organic, kid/pet-safe products the upcoming tasks need,
// minus what is on hand and already on the list. No I/O here.

import { PACKAGE_UNITS, ZONE_LABELS } from '@/lib/domain/constants';
import { productLabel } from '@/lib/domain/format';
import { formatDate } from '@/lib/domain/dates';
import type {
  LawnSettings,
  Product,
  ScheduleTask,
  ShoppingItem,
  ShoppingPlan,
  ShoppingPlanItem,
  ShoppingPlanTaskRef,
  Zone,
} from '@/lib/domain/types';
import type { OnHand } from '../repositories/inventory';
import { isEligible } from '../repositories/products';
import { matchesNeed, needsFor, type ProductNeed } from './shopping-rules';

const DEFAULT_UNIT = 'bag';
const CONDITIONAL_TITLE = /\bif\b/i;

export interface PlanInput {
  readonly from: string;
  readonly to: string;
  readonly tasks: ReadonlyArray<ScheduleTask>;
  readonly products: ReadonlyArray<Product>;
  readonly settings: Pick<LawnSettings, 'front_sqft' | 'back_sqft' | 'total_sqft'>;
  readonly onHand: ReadonlyArray<OnHand>;
  readonly openItems: ReadonlyArray<ShoppingItem>;
}

interface Demand {
  readonly key: string;
  readonly product: Product | null;
  readonly customName: string | null;
  /** Square feet to cover (products with coverage) or a unit count (everything else). */
  readonly area: number;
  readonly units: number;
  readonly tasks: ReadonlyArray<ScheduleTask>;
}

export function zoneArea(zone: Zone, settings: PlanInput['settings']): number {
  if (zone === 'front') return settings.front_sqft;
  if (zone === 'back') return settings.back_sqft;
  return settings.total_sqft;
}

function packageOnHand(onHand: ReadonlyArray<OnHand>, productId: number): { count: number; unit: string | null; ignored: number } {
  const rows = onHand.filter((row) => row.product_id === productId);
  const packaged = rows.filter((row) => PACKAGE_UNITS.has(row.unit));
  const top = [...packaged].sort((a, b) => b.quantity - a.quantity)[0];
  return {
    count: packaged.reduce((sum, row) => sum + row.quantity, 0),
    unit: top?.unit ?? null,
    ignored: rows.length - packaged.length,
  };
}

/** Prefer stock already on the shelf, then known coverage, then fewer bags, then name. */
function rankCandidates(candidates: ReadonlyArray<Product>, onHand: ReadonlyArray<OnHand>): ReadonlyArray<Product> {
  const stock = (p: Product): number => packageOnHand(onHand, p.id).count;
  return [...candidates].sort(
    (a, b) =>
      Number(stock(b) > 0) - Number(stock(a) > 0) ||
      Number(b.coverage_sqft !== null) - Number(a.coverage_sqft !== null) ||
      (b.coverage_sqft ?? 0) - (a.coverage_sqft ?? 0) ||
      a.name.localeCompare(b.name),
  );
}

interface Choice {
  readonly product: Product | null;
  readonly warning: string | null;
}

function chooseProduct(task: ScheduleTask, need: ProductNeed, linkedOnly: boolean, input: PlanInput): Choice {
  const linked = input.products.find((p) => p.id === task.product_id) ?? null;
  if (linked && matchesNeed(linked, need)) {
    if (isEligible(linked)) return { product: linked, warning: null };
    if (linkedOnly) {
      return { product: null, warning: `"${task.title}" links ${linked.name}, which is not organic and kid/pet-safe; not buying it.` };
    }
  }
  if (linkedOnly) return { product: null, warning: null };

  const candidates = input.products.filter((p) => isEligible(p) && matchesNeed(p, need));
  const best = rankCandidates(candidates, input.onHand)[0] ?? null;
  const swapped =
    linked && matchesNeed(linked, need) && !isEligible(linked) && best
      ? `"${task.title}" links ${linked.name}, which is not organic and kid/pet-safe; planned ${best.name} instead.`
      : null;
  if (!best) {
    return { product: null, warning: `No organic, kid/pet-safe ${need.label} in the product list for "${task.title}".` };
  }
  return { product: best, warning: swapped };
}

function collectDemand(input: PlanInput): { demand: ReadonlyArray<Demand>; warnings: ReadonlyArray<string> } {
  const byKey = new Map<string, Demand>();
  const warnings: string[] = [];
  const add = (entry: Omit<Demand, 'tasks'>, task: ScheduleTask): void => {
    const current = byKey.get(entry.key);
    byKey.set(entry.key, {
      ...entry,
      area: (current?.area ?? 0) + entry.area,
      units: (current?.units ?? 0) + entry.units,
      tasks: [...(current?.tasks ?? []), task],
    });
  };

  for (const task of input.tasks) {
    const needs = needsFor(task);
    for (const need of needs.products) {
      const { product, warning } = chooseProduct(task, need, needs.linkedOnly, input);
      if (warning) warnings.push(warning);
      if (!product) continue;
      const area = zoneArea(task.zone, input.settings) * need.rate;
      add({ key: `product:${product.id}`, product, customName: null, area, units: 1 }, task);
    }
    for (const custom of needs.custom) {
      add({ key: `custom:${custom.name.toLowerCase()}`, product: null, customName: custom.name, area: 0, units: custom.quantity }, task);
    }
  }
  return { demand: [...byKey.values()], warnings };
}

function alreadyListed(demand: Demand, openItems: ReadonlyArray<ShoppingItem>): number {
  return openItems
    .filter((item) => item.source === 'manual' && !item.purchased)
    .filter((item) =>
      demand.product
        ? item.product_id === demand.product.id && PACKAGE_UNITS.has(item.unit)
        : item.product_id === null && item.custom_name?.trim().toLowerCase() === demand.customName?.toLowerCase(),
    )
    .reduce((sum, item) => sum + item.quantity_needed, 0);
}

function describe(demand: Demand, required: number, onHand: number, listed: number, ignored: number): string {
  const taskList = demand.tasks.map((t) => `${t.title} (${formatDate(t.scheduled_date)})`).join('; ');
  const zones = [...new Set(demand.tasks.map((t) => ZONE_LABELS[t.zone].toLowerCase()))].join(', ');
  const coverage =
    demand.product?.coverage_sqft
      ? `${Math.round(demand.area).toLocaleString('en-US')} sq ft (${zones}) at ${demand.product.coverage_sqft.toLocaleString('en-US')} sq ft per unit`
      : null;
  const parts = [
    `For: ${taskList}`,
    coverage,
    `need ${required}, have ${onHand}${listed > 0 ? `, ${listed} already listed` : ''}`,
    ignored > 0 ? 'stock in lb/oz/gal not counted' : null,
    demand.tasks.some((t) => CONDITIONAL_TITLE.test(t.title)) ? 'only if the task applies (see task notes)' : null,
  ];
  return parts.filter((part): part is string => part !== null).join(' · ');
}

function toItem(demand: Demand, input: PlanInput): ShoppingPlanItem {
  const coverage = demand.product?.coverage_sqft ?? null;
  const required = coverage ? Math.ceil(demand.area / coverage) : demand.product ? 1 : demand.units;
  const stock = demand.product ? packageOnHand(input.onHand, demand.product.id) : { count: 0, unit: null, ignored: 0 };
  const listed = alreadyListed(demand, input.openItems);
  const tasks: ReadonlyArray<ShoppingPlanTaskRef> = demand.tasks.map(({ id, title, scheduled_date }) => ({ id, title, scheduled_date }));
  return {
    key: demand.key,
    product_id: demand.product?.id ?? null,
    custom_name: demand.customName,
    name: demand.product ? productLabel(demand.product) : (demand.customName ?? ''),
    unit: demand.product ? (stock.unit ?? DEFAULT_UNIT) : 'each',
    required,
    on_hand: stock.count,
    already_listed: listed,
    quantity_needed: Math.max(0, Math.ceil(required - stock.count - listed)),
    tasks,
    reason: describe(demand, required, stock.count, listed, stock.ignored),
  };
}

export function planShopping(input: PlanInput): ShoppingPlan {
  const { demand, warnings } = collectDemand(input);
  const items = demand.map((entry) => toItem(entry, input)).sort((a, b) => a.name.localeCompare(b.name));
  return { from: input.from, to: input.to, items, warnings: [...new Set(warnings)] };
}
