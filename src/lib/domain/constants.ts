// Domain constants shared by server and client. The vocabulary lists live in
// vocabulary.ts; everything about the owner's yard comes from the yard config.

import { PRODUCT_CATEGORIES, TASK_CATEGORIES, TASK_STATUSES, TOOL_TYPES, UNITS, ZONES } from './vocabulary';
import { YARD } from './yard-config';

export * from './vocabulary';

/** Growing season from the yard config (month and day, any year). */
export const SEASON = YARD.season;

/** All dates in the app are calendar days in the yard's local time zone. */
export const APP_TIMEZONE = YARD.location.timezone;

export const DEFAULT_LOCATION = {
  city: YARD.location.city,
  state: YARD.location.state,
  latitude: YARD.location.latitude,
  longitude: YARD.location.longitude,
} as const;

export const USDA_ZONE = YARD.location.usda_zone;

/** Short place name for headings, e.g. "Springfield, IL". */
export const LOCATION_LABEL = `${YARD.location.city}, ${YARD.location.state}`;


export const TASK_CATEGORY_LABELS: Readonly<Record<(typeof TASK_CATEGORIES)[number], string>> = {
  fertilizer: 'Fertilizer',
  'weed-control': 'Weed control',
  mowing: 'Mowing',
  aeration: 'Aeration',
  overseeding: 'Overseeding',
  'soil-test': 'Soil test',
  cleanup: 'Cleanup',
  watering: 'Watering',
};

export const PRODUCT_CATEGORY_LABELS: Readonly<Record<(typeof PRODUCT_CATEGORIES)[number], string>> = {
  fertilizer: 'Fertilizer',
  'weed-control': 'Weed control',
  seed: 'Seed',
  'soil-amendment': 'Soil amendment',
  tool: 'Tool',
  other: 'Other',
};

export const TOOL_TYPE_LABELS: Readonly<Record<(typeof TOOL_TYPES)[number], string>> = {
  mower: 'Mower',
  trimmer: 'Trimmer',
  rake: 'Rakes',
  shovel: 'Shovels',
  sprayer: 'Sprayers and irrigation',
  spreader: 'Spreader',
  gauge: 'Gauges and measuring',
  sharpening: 'Sharpening and blade care',
  hauling: 'Hauling',
  'hand-tool': 'Hand tools',
  other: 'Other',
};

export const ZONE_LABELS: Readonly<Record<(typeof ZONES)[number], string>> = {
  front: 'Front yard',
  back: 'Back yard',
  both: 'Whole lawn',
};

export const STATUS_LABELS: Readonly<Record<(typeof TASK_STATUSES)[number] | 'overdue', string>> = {
  pending: 'Upcoming',
  completed: 'Done',
  skipped: 'Skipped',
  overdue: 'Overdue',
};

export function isUnit(value: string): value is (typeof UNITS)[number] {
  return (UNITS as ReadonlyArray<string>).includes(value);
}
