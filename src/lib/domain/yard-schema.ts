// Schema for the yard config JSON (config/greenkeeper.example.json shape). Imports
// only the vocabulary lists so constants.ts can depend on the parsed config.

import { z } from 'zod';
import { PRODUCT_CATEGORIES, TOOL_TYPES, USDA_ZONES } from './vocabulary';

const LIMITS = {
  name: 200,
  notes: 2_000,
  url: 2_000,
  maxSqft: 1_000_000,
} as const;

/** Non-leap reference year, so Feb 29 is rejected as a season bound. */
const REFERENCE_YEAR = 2001;

const httpUrl = z
  .string()
  .trim()
  .max(LIMITS.url)
  .refine((value) => /^https?:\/\//i.test(value) && URL.canParse(value), { message: 'Must be an http(s) URL' });

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function dayOfYear(month: number, day: number): number | null {
  const date = new Date(Date.UTC(REFERENCE_YEAR, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.getTime();
}

const locationSchema = z.strictObject({
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, 'Use a two-letter state code'),
  usda_zone: z.enum(USDA_ZONES),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().trim().refine(isTimeZone, { message: 'Must be an IANA time zone, e.g. "America/New_York"' }),
});

const month = z.number().int().min(1).max(12);
const day = z.number().int().min(1).max(31);

const seasonSchema = z
  .strictObject({ startMonth: month, startDay: day, endMonth: month, endDay: day })
  .superRefine((season, ctx) => {
    const start = dayOfYear(season.startMonth, season.startDay);
    const end = dayOfYear(season.endMonth, season.endDay);
    if (start === null) ctx.addIssue({ code: 'custom', message: 'Season start is not a real date', path: ['startDay'] });
    if (end === null) ctx.addIssue({ code: 'custom', message: 'Season end is not a real date', path: ['endDay'] });
    if (start !== null && end !== null && start >= end) {
      ctx.addIssue({ code: 'custom', message: 'Season must end after it starts, within one year', path: ['endMonth'] });
    }
  });

const yardSchema = z
  .strictObject({
    total_sqft: z.number().int().min(100).max(LIMITS.maxSqft),
    front_sqft: z.number().int().min(0).max(LIMITS.maxSqft),
    back_sqft: z.number().int().min(0).max(LIMITS.maxSqft),
    shade_percentage: z.number().int().min(0).max(100),
  })
  .refine((yard) => yard.front_sqft + yard.back_sqft <= yard.total_sqft, {
    message: 'front_sqft + back_sqft cannot exceed total_sqft',
    path: ['total_sqft'],
  });

const equipmentSchema = z.strictObject({
  mower_brand: z.string().trim().min(1).max(100).nullable(),
  mower_model: z.string().trim().min(1).max(100).nullable(),
  spreader_model: z.string().trim().min(1).max(100).nullable(),
});

const soilLabSchema = z.strictObject({
  name: z.string().trim().min(1).max(LIMITS.name),
  url: httpUrl.nullable(),
});

/**
 * Same shape as the built-in catalog entries. Listing a product here vouches that it
 * is organic and kid/pet-safe: the seed stores it with both flags set.
 */
export const yardProductSchema = z
  .strictObject({
    name: z.string().trim().min(1).max(LIMITS.name),
    brand: z.string().trim().min(1).max(LIMITS.name),
    category: z.enum(PRODUCT_CATEGORIES),
    coverage_sqft: z.number().int().positive().max(LIMITS.maxSqft).nullable(),
    notes: z.string().trim().max(LIMITS.notes),
    url: httpUrl.nullable(),
    tool_type: z.enum(TOOL_TYPES).nullable(),
  })
  .refine((value) => value.category === 'tool' || value.tool_type === null, {
    message: 'tool_type is only allowed for tools',
    path: ['tool_type'],
  });

export const yardConfigSchema = z.strictObject({
  $comment: z.string().optional(),
  location: locationSchema,
  season: seasonSchema,
  yard: yardSchema,
  equipment: equipmentSchema,
  soil_lab: soilLabSchema,
  extra_products: z.array(yardProductSchema).default([]),
  /** Built-in catalog key -> other names the same product has in an existing database. */
  product_aliases: z.record(z.string(), z.array(z.string().trim().min(1).max(LIMITS.name))).default({}),
});

export type YardConfig = z.output<typeof yardConfigSchema>;
export type YardProduct = z.output<typeof yardProductSchema>;
