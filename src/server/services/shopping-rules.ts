// Task-category → product mapping for the shopping generator. Pure data plus
// matchers, so the rules are easy to read, test and extend.

import { isPreEmergent } from '@/lib/domain/schedule-rules';
import type { Product, ProductCategory, ScheduleTask, TaskCategory } from '@/lib/domain/types';
import { YARD } from '@/lib/domain/yard-config';

/** One thing a task consumes, chosen from the catalog. */
export interface ProductNeed {
  readonly label: string;
  readonly categories: ReadonlyArray<ProductCategory>;
  /** Product name must match (when set). */
  readonly include?: RegExp;
  /** Product name must not match (when set). */
  readonly exclude?: RegExp;
  /** Multiplier on the zone area, e.g. 0.5 for a half-rate feeding. */
  readonly rate: number;
}

/** Something rented or paid for rather than taken from the catalog. */
export interface CustomNeed {
  readonly name: string;
  readonly unit: 'each';
  readonly quantity: number;
}

export interface TaskNeeds {
  readonly products: ReadonlyArray<ProductNeed>;
  readonly custom: ReadonlyArray<CustomNeed>;
  /** True when only an explicitly linked consumable product should be bought. */
  readonly linkedOnly: boolean;
}

const WINTERIZER = /winteriz/i;
const LIME = /\blime\b/i;
const PRE_EMERGENT_PRODUCT = /corn gluten|pre-?emergent|weed preventer/i;
const COMPOST = /compost|top[- ]?dress/i;
const HALF_RATE = /\blight\b|half[- ]rate|half the normal/i;
const CLOVER = /clover/i;
const SPOT_SEEDING = /\b(spots?|bare|thin|patch)\b/i;
/** Share of a zone assumed to need seed when patching spots. */
export const SPOT_SEEDING_SHARE = 0.25;

export const CORE_AERATOR_RENTAL = 'Core aerator rental (half day)';
const SOIL_LAB = YARD.soil_lab.name;
export const SOIL_TEST_FEE = `${SOIL_LAB.charAt(0).toUpperCase()}${SOIL_LAB.slice(1)} soil test (lab fee)`;

const NONE: TaskNeeds = { products: [], custom: [], linkedOnly: false };

function rateFor(task: Pick<ScheduleTask, 'title'>): number {
  return HALF_RATE.test(task.title) ? 0.5 : 1;
}

function fertilizerNeeds(task: ScheduleTask): TaskNeeds {
  const rate = rateFor(task);
  if (LIME.test(task.title)) {
    return { ...NONE, products: [{ label: 'lime', categories: ['soil-amendment'], include: LIME, rate }] };
  }
  if (WINTERIZER.test(task.title)) {
    return { ...NONE, products: [{ label: 'winterizer', categories: ['fertilizer'], include: WINTERIZER, rate }] };
  }
  return { ...NONE, products: [{ label: 'fertilizer', categories: ['fertilizer'], exclude: WINTERIZER, rate }] };
}

function weedControlNeeds(task: ScheduleTask): TaskNeeds {
  if (isPreEmergent(task)) {
    return {
      ...NONE,
      products: [{ label: 'pre-emergent', categories: ['weed-control'], include: PRE_EMERGENT_PRODUCT, rate: rateFor(task) }],
    };
  }
  // Spot treatment: hand-pulling by default; buy only a product the owner linked.
  return {
    products: [{ label: 'weed control', categories: ['weed-control'], exclude: PRE_EMERGENT_PRODUCT, rate: 1 }],
    custom: [],
    linkedOnly: true,
  };
}

function overseedingNeeds(task: ScheduleTask): TaskNeeds {
  const text = `${task.title} ${task.description}`;
  // Patching bare and thin spots covers a fraction of the zone, not all of it.
  const rate = SPOT_SEEDING.test(task.title) ? SPOT_SEEDING_SHARE : rateFor(task);
  const needs: ReadonlyArray<ProductNeed | null> = [
    { label: 'grass seed', categories: ['seed'], exclude: CLOVER, rate },
    CLOVER.test(text) ? { label: 'clover seed', categories: ['seed'], include: CLOVER, rate } : null,
    COMPOST.test(text) ? { label: 'compost', categories: ['soil-amendment'], include: COMPOST, rate: 1 } : null,
  ];
  return { ...NONE, products: needs.filter((need): need is ProductNeed => need !== null) };
}

const RULES: Readonly<Record<TaskCategory, (task: ScheduleTask) => TaskNeeds>> = {
  fertilizer: fertilizerNeeds,
  'weed-control': weedControlNeeds,
  overseeding: overseedingNeeds,
  aeration: () => ({ ...NONE, custom: [{ name: CORE_AERATOR_RENTAL, unit: 'each', quantity: 1 }] }),
  'soil-test': () => ({ ...NONE, custom: [{ name: SOIL_TEST_FEE, unit: 'each', quantity: 1 }] }),
  mowing: () => NONE,
  watering: () => NONE,
  cleanup: () => NONE,
};

export function needsFor(task: ScheduleTask): TaskNeeds {
  return RULES[task.category](task);
}

export function matchesNeed(product: Product, need: ProductNeed): boolean {
  if (product.category === 'tool') return false;
  if (!need.categories.includes(product.category)) return false;
  if (need.include && !need.include.test(product.name)) return false;
  if (need.exclude && need.exclude.test(product.name)) return false;
  return true;
}
