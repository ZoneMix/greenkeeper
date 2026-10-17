// Input schemas for every API boundary. Shared with the client so forms and
// routes agree on the rules.

import { z } from 'zod';
import {
  PRODUCT_CATEGORIES,
  TASK_CATEGORIES,
  TASK_STATUSES,
  TOOL_TYPES,
  UNITS,
  USDA_ZONES,
  ZONES,
} from './constants';
import { isIsoDate } from './dates';

const LIMITS = {
  title: 200,
  name: 200,
  text: 5_000,
  notes: 2_000,
  url: 2_000,
  maxSqft: 1_000_000,
  maxQuantity: 10_000,
  maxListLimit: 500,
  maxHorizonDays: 120,
} as const;

const SAFETY_MESSAGE = 'Greenkeeper only tracks organic, kid- and pet-safe products';

export const isoDate = z.string().refine(isIsoDate, { message: 'Must be a valid date (YYYY-MM-DD)' });
const monthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Must be YYYY-MM');
const id = z.number().int().positive();
const nullableText = (max: number) => z.string().trim().max(max).nullable();
const httpUrl = z
  .string()
  .trim()
  .max(LIMITS.url)
  .refine((value) => /^https?:\/\//i.test(value) && URL.canParse(value), { message: 'Must be an http(s) URL' });

export const idParamSchema = z.coerce.number().int().positive();

// ── tasks ──

export const taskCreateSchema = z.strictObject({
  title: z.string().trim().min(1, 'Title is required').max(LIMITS.title),
  description: z.string().trim().max(LIMITS.text).default(''),
  category: z.enum(TASK_CATEGORIES),
  scheduled_date: isoDate,
  zone: z.enum(ZONES).default('both'),
  product_id: id.nullable().default(null),
  notes: nullableText(LIMITS.notes).default(null),
});

export const taskUpdateSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(LIMITS.title),
    description: z.string().trim().max(LIMITS.text),
    category: z.enum(TASK_CATEGORIES),
    scheduled_date: isoDate,
    zone: z.enum(ZONES),
    status: z.enum(TASK_STATUSES),
    product_id: id.nullable(),
    notes: nullableText(LIMITS.notes),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field to update' });

export const taskListQuerySchema = z.strictObject({
  status: z.enum(TASK_STATUSES).optional(),
  category: z.enum(TASK_CATEGORIES).optional(),
  month: monthKeySchema.optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  limit: z.coerce.number().int().min(1).max(LIMITS.maxListLimit).optional(),
});

export const seasonPlanSchema = z.strictObject({
  year: z.number().int().min(2000).max(2100),
});

// ── products ──

export const productCreateSchema = z
  .strictObject({
    name: z.string().trim().min(1, 'Name is required').max(LIMITS.name),
    brand: z.string().trim().min(1, 'Brand is required').max(LIMITS.name),
    category: z.enum(PRODUCT_CATEGORIES),
    coverage_sqft: z.number().int().positive().max(LIMITS.maxSqft).nullable().default(null),
    organic: z.literal(true, { message: SAFETY_MESSAGE }).default(true),
    kid_safe: z.literal(true, { message: SAFETY_MESSAGE }).default(true),
    notes: nullableText(LIMITS.notes).default(null),
    url: httpUrl.nullable().default(null),
    tool_type: z.enum(TOOL_TYPES).nullable().default(null),
  })
  .refine((value) => value.category === 'tool' || value.tool_type === null, {
    message: 'tool_type is only allowed for tools',
    path: ['tool_type'],
  });

export const productListQuerySchema = z.strictObject({
  category: z.enum(PRODUCT_CATEGORIES).optional(),
  search: z.string().trim().max(LIMITS.name).optional(),
});

// ── inventory ──

export const inventoryCreateSchema = z.strictObject({
  product_id: id,
  quantity: z.number().min(0).max(LIMITS.maxQuantity),
  unit: z.enum(UNITS),
  purchased_date: isoDate.nullable().default(null),
  notes: nullableText(LIMITS.notes).default(null),
});

export const inventoryUpdateSchema = z
  .strictObject({
    quantity: z.number().min(0).max(LIMITS.maxQuantity),
    unit: z.enum(UNITS),
    purchased_date: isoDate.nullable(),
    notes: nullableText(LIMITS.notes),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field to update' });

// ── shopping ──

export const shoppingCreateSchema = z
  .strictObject({
    product_id: id.nullable().default(null),
    custom_name: z.string().trim().min(1).max(LIMITS.name).nullable().default(null),
    quantity_needed: z.number().positive().max(LIMITS.maxQuantity).default(1),
    unit: z.enum(UNITS),
    notes: nullableText(LIMITS.notes).default(null),
  })
  .refine((value) => value.product_id !== null || value.custom_name !== null, {
    message: 'Either product_id or custom_name is required',
    path: ['product_id'],
  });

export const shoppingUpdateSchema = z
  .strictObject({
    quantity_needed: z.number().positive().max(LIMITS.maxQuantity),
    unit: z.enum(UNITS),
    purchased: z.boolean(),
    notes: nullableText(LIMITS.notes),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field to update' });

export const shoppingListQuerySchema = z.strictObject({
  purchased: z.enum(['true', 'false']).optional(),
});

export const shoppingGenerateSchema = z.strictObject({
  horizon_days: z.number().int().min(1).max(LIMITS.maxHorizonDays).default(30),
  dry_run: z.boolean().default(false),
});

// ── settings ──

export const settingsUpdateSchema = z
  .strictObject({
    total_sqft: z.number().int().min(100).max(LIMITS.maxSqft),
    front_sqft: z.number().int().min(0).max(LIMITS.maxSqft),
    back_sqft: z.number().int().min(0).max(LIMITS.maxSqft),
    shade_percentage: z.number().int().min(0).max(100),
    spreader_model: z.string().trim().max(100).nullable(),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, 'Use a two-letter state code'),
    usda_zone: z.enum(USDA_ZONES),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    mower_brand: z.string().trim().max(100).nullable(),
    mower_model: z.string().trim().max(100).nullable(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field to update' });

export type TaskCreateInput = z.output<typeof taskCreateSchema>;
export type TaskUpdateInput = z.output<typeof taskUpdateSchema>;
export type TaskListQuery = z.output<typeof taskListQuerySchema>;
export type ProductCreateInput = z.output<typeof productCreateSchema>;
export type ProductListQuery = z.output<typeof productListQuerySchema>;
export type InventoryCreateInput = z.output<typeof inventoryCreateSchema>;
export type InventoryUpdateInput = z.output<typeof inventoryUpdateSchema>;
export type ShoppingCreateInput = z.output<typeof shoppingCreateSchema>;
export type ShoppingUpdateInput = z.output<typeof shoppingUpdateSchema>;
export type ShoppingGenerateInput = z.output<typeof shoppingGenerateSchema>;
export type SettingsUpdateInput = z.output<typeof settingsUpdateSchema>;
