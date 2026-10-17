// Domain vocabulary shared by server and client. These lists mirror the CHECK
// constraints in the SQLite schema, so changing one means a migration. Kept free of
// imports so the yard-config schema can use them without an import cycle.

export const TASK_CATEGORIES = [
  'fertilizer',
  'weed-control',
  'mowing',
  'aeration',
  'overseeding',
  'soil-test',
  'cleanup',
  'watering',
] as const;

export const TASK_STATUSES = ['pending', 'completed', 'skipped'] as const;

export const ZONES = ['front', 'back', 'both'] as const;

export const PRODUCT_CATEGORIES = [
  'fertilizer',
  'weed-control',
  'seed',
  'soil-amendment',
  'tool',
  'other',
] as const;

export const TOOL_TYPES = [
  'mower',
  'trimmer',
  'rake',
  'shovel',
  'sprayer',
  'spreader',
  'gauge',
  'sharpening',
  'hauling',
  'hand-tool',
  'other',
] as const;

export const UNITS = ['bag', 'bottle', 'lb', 'oz', 'gal', 'each'] as const;

/** Units that count whole retail packages, so they can be compared to coverage per unit. */
export const PACKAGE_UNITS: ReadonlySet<string> = new Set(['bag', 'bottle', 'each']);

export const SHOPPING_SOURCES = ['manual', 'generated'] as const;

export const USDA_ZONES = ['3a', '3b', '4a', '4b', '5a', '5b', '6a', '6b', '7a', '7b'] as const;
