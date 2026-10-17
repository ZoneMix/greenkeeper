import { describe, expect, it } from 'vitest';
import {
  productCreateSchema,
  settingsUpdateSchema,
  shoppingCreateSchema,
  shoppingGenerateSchema,
  taskCreateSchema,
  taskListQuerySchema,
  taskUpdateSchema,
} from '@/lib/domain/schemas';

describe('taskCreateSchema', () => {
  it('fills defaults and trims text', () => {
    const parsed = taskCreateSchema.parse({ title: '  Mow  ', category: 'mowing', scheduled_date: '2026-06-01' });
    expect(parsed).toEqual({
      title: 'Mow',
      description: '',
      category: 'mowing',
      scheduled_date: '2026-06-01',
      zone: 'both',
      product_id: null,
      notes: null,
    });
  });

  it('rejects impossible dates, unknown categories and unknown fields', () => {
    expect(taskCreateSchema.safeParse({ title: 'x', category: 'mowing', scheduled_date: '2026-02-31' }).success).toBe(false);
    expect(taskCreateSchema.safeParse({ title: 'x', category: 'napping', scheduled_date: '2026-06-01' }).success).toBe(false);
    expect(
      taskCreateSchema.safeParse({ title: 'x', category: 'mowing', scheduled_date: '2026-06-01', admin: true }).success,
    ).toBe(false);
  });
});

describe('taskUpdateSchema', () => {
  it('requires at least one field', () => {
    expect(taskUpdateSchema.safeParse({}).success).toBe(false);
    expect(taskUpdateSchema.safeParse({ status: 'completed' }).success).toBe(true);
  });
});

describe('taskListQuerySchema', () => {
  it('coerces limit and validates month', () => {
    expect(taskListQuerySchema.parse({ limit: '5', month: '2026-06' })).toEqual({ limit: 5, month: '2026-06' });
    expect(taskListQuerySchema.safeParse({ month: '2026-13' }).success).toBe(false);
    expect(taskListQuerySchema.safeParse({ limit: '0' }).success).toBe(false);
  });
});

describe('productCreateSchema', () => {
  const base = { name: 'Compost', brand: 'Local', category: 'soil-amendment' };

  it('defaults new products to organic and kid-safe', () => {
    expect(productCreateSchema.parse(base)).toMatchObject({ organic: true, kid_safe: true });
  });

  it('refuses products that are not organic or not kid-safe', () => {
    expect(productCreateSchema.safeParse({ ...base, organic: false }).success).toBe(false);
    expect(productCreateSchema.safeParse({ ...base, kid_safe: false }).success).toBe(false);
  });

  it('only allows http(s) URLs and tool_type on tools', () => {
    expect(productCreateSchema.safeParse({ ...base, url: 'javascript:alert(1)' }).success).toBe(false);
    expect(productCreateSchema.safeParse({ ...base, url: 'https://example.com' }).success).toBe(true);
    expect(productCreateSchema.safeParse({ ...base, tool_type: 'rake' }).success).toBe(false);
  });
});

describe('shoppingCreateSchema', () => {
  it('needs a product or a custom name', () => {
    expect(shoppingCreateSchema.safeParse({ unit: 'bag' }).success).toBe(false);
    expect(shoppingCreateSchema.parse({ custom_name: 'Twine', unit: 'each' })).toMatchObject({ quantity_needed: 1 });
  });
});

describe('shoppingGenerateSchema', () => {
  it('defaults to a 30-day live run and caps the horizon', () => {
    expect(shoppingGenerateSchema.parse({})).toEqual({ horizon_days: 30, dry_run: false });
    expect(shoppingGenerateSchema.safeParse({ horizon_days: 365 }).success).toBe(false);
  });
});

describe('settingsUpdateSchema', () => {
  it('normalises the state code and bounds coordinates', () => {
    expect(settingsUpdateSchema.parse({ state: 'zz' })).toEqual({ state: 'ZZ' });
    expect(settingsUpdateSchema.safeParse({ latitude: 120 }).success).toBe(false);
    expect(settingsUpdateSchema.safeParse({ id: 2 }).success).toBe(false);
  });
});
