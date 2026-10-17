// Starter product catalog for a fresh database. Every entry is organic (or naturally
// derived with no synthetic coating) AND kid/pet-safe. The season template refers to
// products by catalog key; `catalogNames` adds the yard config's product_aliases so a
// database seeded under older names still links.

import type { ProductCategory, ToolType } from '@/lib/domain/types';
import { YARD } from '@/lib/domain/yard-config';

export interface CatalogProduct {
  readonly name: string;
  readonly brand: string;
  readonly category: ProductCategory;
  readonly coverage_sqft: number | null;
  readonly notes: string;
  readonly url: string | null;
  readonly tool_type: ToolType | null;
}

export const PRODUCT_NAMES = {
  milorganite: 'Milorganite Organic Nitrogen Fertilizer',
  espomaLawnFood: 'Espoma Organic Lawn Food',
  jonathanGreen: 'Jonathan Green Organic Lawn Fertilizer',
  cornGluten: 'Corn Gluten Meal Pre-Emergent',
  sunShadeSeed: 'Sun & Shade Grass Seed Blend (uncoated)',
  clover: 'White Clover Seed',
  espomaWeedPreventer: 'Espoma Organic Weed Preventer',
  weedPuller: 'Fiskars 4-Claw Stand-up Weed Puller',
  lime: 'Pelletized Lime',
  trimmer: 'Cordless String Trimmer',
  soilTest: 'Soil Test Kit (Cooperative Extension)',
  winterizer: 'Espoma Organic Winterizer',
  compost: 'Compost / Top Dressing',
} as const;

export type CatalogKey = keyof typeof PRODUCT_NAMES;

function isCatalogKey(key: string): key is CatalogKey {
  return Object.hasOwn(PRODUCT_NAMES, key);
}

function checkedAliases(aliases: Readonly<Record<string, ReadonlyArray<string>>>): Readonly<Partial<Record<CatalogKey, ReadonlyArray<string>>>> {
  const unknown = Object.keys(aliases).filter((key) => !isCatalogKey(key));
  if (unknown.length > 0) {
    throw new Error(
      `Yard config product_aliases has unknown catalog keys: ${unknown.join(', ')}. ` +
        `Valid keys: ${Object.keys(PRODUCT_NAMES).join(', ')}`,
    );
  }
  return aliases;
}

const PRODUCT_ALIASES = checkedAliases(YARD.product_aliases);

/** Every name a catalog product may have in the database: current name first, then aliases. */
export function catalogNames(key: CatalogKey): ReadonlyArray<string> {
  return [PRODUCT_NAMES[key], ...(PRODUCT_ALIASES[key] ?? [])];
}

const BUILT_IN_CATALOG: ReadonlyArray<CatalogProduct> = [
  {
    name: PRODUCT_NAMES.milorganite,
    brand: 'Milorganite',
    category: 'fertilizer',
    coverage_sqft: 2500,
    notes: '32 lb bag. Slow-release nitrogen. Safe for kids and pets right after application; no burn risk.',
    url: 'https://www.milorganite.com/',
    tool_type: null,
  },
  {
    name: PRODUCT_NAMES.espomaLawnFood,
    brand: 'Espoma',
    category: 'fertilizer',
    coverage_sqft: 5000,
    notes: 'OMRI-listed organic lawn fertilizer. Safe for kids and pets. Apply with a broadcast spreader.',
    url: 'https://www.espoma.com/',
    tool_type: null,
  },
  {
    name: PRODUCT_NAMES.jonathanGreen,
    brand: 'Jonathan Green',
    category: 'fertilizer',
    coverage_sqft: 5000,
    notes: 'Slow-release organic formula. Safe for children and pets after watering in.',
    url: 'https://jonathangreen.com/',
    tool_type: null,
  },
  {
    name: PRODUCT_NAMES.cornGluten,
    brand: 'Various',
    category: 'weed-control',
    coverage_sqft: 2000,
    notes: '40 lb bag. Natural pre-emergent that also feeds nitrogen. Apply when soil holds 55°F. Kid and pet safe.',
    url: null,
    tool_type: null,
  },
  {
    name: PRODUCT_NAMES.sunShadeSeed,
    brand: 'Various',
    category: 'seed',
    coverage_sqft: 2300,
    notes:
      '7 lb bag, about 2,300 sq ft at the 3 lb per 1,000 sq ft overseeding rate. Kentucky bluegrass, perennial ' +
      'ryegrass and fine fescue for mixed sun and shade. Choose uncoated seed: coatings often carry synthetic fertilizer.',
    url: null,
    tool_type: null,
  },
  {
    name: PRODUCT_NAMES.clover,
    brand: 'Various',
    category: 'seed',
    coverage_sqft: 4000,
    notes: 'Dutch white clover. Fixes nitrogen, stays green in drought, pollinator-friendly. Safe for kids.',
    url: null,
    tool_type: null,
  },
  {
    name: PRODUCT_NAMES.espomaWeedPreventer,
    brand: 'Espoma',
    category: 'weed-control',
    coverage_sqft: 1250,
    notes: 'Corn gluten pre-emergent. OMRI-listed. Safe for kids and pets immediately.',
    url: 'https://www.espoma.com/',
    tool_type: null,
  },
  {
    name: PRODUCT_NAMES.weedPuller,
    brand: 'Fiskars',
    category: 'tool',
    coverage_sqft: null,
    notes: 'Pulls dandelions and plantain root and all without chemicals. Best when soil is moist.',
    url: 'https://www.fiskars.com/',
    tool_type: 'hand-tool',
  },
  {
    name: PRODUCT_NAMES.lime,
    brand: 'Various',
    category: 'soil-amendment',
    coverage_sqft: 1000,
    notes: '40 lb bag. Raises soil pH only if a soil test shows acidity. Safe for kids after watering in.',
    url: null,
    tool_type: null,
  },
  {
    name: PRODUCT_NAMES.trimmer,
    brand: 'Various',
    category: 'tool',
    coverage_sqft: null,
    notes: 'Battery string trimmer for edging along walks, fences and obstacles.',
    url: null,
    tool_type: 'trimmer',
  },
  {
    name: PRODUCT_NAMES.soilTest,
    brand: 'Cooperative Extension',
    category: 'tool',
    coverage_sqft: null,
    notes: `Send a soil sample to ${YARD.soil_lab.name} for pH, N-P-K and organic matter with recommendations.`,
    url: YARD.soil_lab.url,
    tool_type: 'gauge',
  },
  {
    name: PRODUCT_NAMES.winterizer,
    brand: 'Espoma',
    category: 'fertilizer',
    coverage_sqft: 5000,
    notes: 'Fall winterizer. Builds roots ahead of winter dormancy. Safe for kids and pets.',
    url: 'https://www.espoma.com/',
    tool_type: null,
  },
  {
    name: PRODUCT_NAMES.compost,
    brand: 'Local',
    category: 'soil-amendment',
    coverage_sqft: null,
    notes: 'Screened compost for top dressing after aeration or overseeding. Source locally.',
    url: null,
    tool_type: null,
  },
];

function withExtras(builtIn: ReadonlyArray<CatalogProduct>, extras: ReadonlyArray<CatalogProduct>): ReadonlyArray<CatalogProduct> {
  const all = [...builtIn, ...extras];
  const names = all.map((product) => product.name.toLowerCase());
  const duplicates = all.filter((product, index) => names.indexOf(product.name.toLowerCase()) !== index);
  if (duplicates.length > 0) {
    throw new Error(`Yard config extra_products repeats product names: ${duplicates.map((p) => p.name).join(', ')}`);
  }
  return all;
}

/** Seeded into a fresh database: the built-in catalog plus the yard config's extra_products. */
export const PRODUCT_CATALOG: ReadonlyArray<CatalogProduct> = withExtras(BUILT_IN_CATALOG, YARD.extra_products);
