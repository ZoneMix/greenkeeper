import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import * as dashboard from '@/app/api/dashboard/route';
import * as health from '@/app/api/health/route';
import * as inventoryById from '@/app/api/inventory/[id]/route';
import * as inventory from '@/app/api/inventory/route';
import * as products from '@/app/api/products/route';
import * as settings from '@/app/api/settings/route';
import * as shoppingById from '@/app/api/shopping/[id]/route';
import * as shopping from '@/app/api/shopping/route';
import * as weather from '@/app/api/weather/route';
import type { DashboardSummary, InventoryItem, LawnSettings, Product, ShoppingItem } from '@/lib/domain/types';
import { YARD } from '@/lib/domain/yard-config';
import { closeDb } from '@/server/database';
import { LATEST_SCHEMA_VERSION } from '@/server/db/migrations';
import { idContext, json, request, useTempDatabase } from '../helpers/api';

beforeEach(() => {
  useTempDatabase();
});
afterAll(() => closeDb());

describe('products', () => {
  it('lists, filters and searches', async () => {
    const seeds = await json<ReadonlyArray<Product>>(await products.GET(request('/api/products?category=fertilizer')));
    expect(seeds.data?.every((p) => p.category === 'fertilizer')).toBe(true);
    const found = await json<ReadonlyArray<Product>>(await products.GET(request('/api/products?search=milorg')));
    expect(found.data?.[0]?.name).toMatch(/Milorganite/);
  });

  it('creates only organic, kid-safe products', async () => {
    const created = await products.POST(
      request('/api/products', { method: 'POST', body: { name: 'Leaf compost', brand: 'City', category: 'soil-amendment' } }),
    );
    expect(created.status).toBe(201);
    expect((await json<Product>(created)).data).toMatchObject({ organic: true, kid_safe: true });

    const rejected = await products.POST(
      request('/api/products', { method: 'POST', body: { name: 'Weed & Feed', brand: 'X', category: 'fertilizer', organic: false } }),
    );
    expect(rejected.status).toBe(400);
  });
});

describe('inventory', () => {
  it('adds, updates and deletes items', async () => {
    const created = await json<InventoryItem>(
      await inventory.POST(request('/api/inventory', { method: 'POST', body: { product_id: 1, quantity: 2, unit: 'bag' } })),
    );
    const id = created.data?.id ?? 0;
    expect(created.data?.product.id).toBe(1);

    const patched = await json<InventoryItem>(
      await inventoryById.PATCH(request(`/api/inventory/${id}`, { method: 'PATCH', body: { quantity: 0.5 } }), idContext(id)),
    );
    expect(patched.data?.quantity).toBe(0.5);

    const list = await json<ReadonlyArray<InventoryItem>>(await inventory.GET());
    expect(list.meta?.total).toBe(1);

    expect((await inventoryById.DELETE(request(`/api/inventory/${id}`), idContext(id))).status).toBe(200);
    expect((await inventoryById.DELETE(request(`/api/inventory/${id}`), idContext(id))).status).toBe(404);
  });

  it('validates product and quantity', async () => {
    const res = await inventory.POST(request('/api/inventory', { method: 'POST', body: { product_id: 999, quantity: 1, unit: 'bag' } }));
    expect(res.status).toBe(400);
    const negative = await inventory.POST(request('/api/inventory', { method: 'POST', body: { product_id: 1, quantity: -1, unit: 'bag' } }));
    expect((await json(negative)).error?.details?.[0]?.field).toBe('quantity');
  });
});

describe('shopping', () => {
  it('adds manual items and toggles purchased', async () => {
    const created = await json<ShoppingItem>(
      await shopping.POST(request('/api/shopping', { method: 'POST', body: { custom_name: 'Rain gauge', unit: 'each' } })),
    );
    expect(created.data).toMatchObject({ source: 'manual', purchased: false, product: null });
    const id = created.data?.id ?? 0;

    const toggled = await json<ShoppingItem>(
      await shoppingById.PATCH(request(`/api/shopping/${id}`, { method: 'PATCH', body: { purchased: true } }), idContext(id)),
    );
    expect(toggled.data?.purchased).toBe(true);

    const open = await json<ReadonlyArray<ShoppingItem>>(await shopping.GET(request('/api/shopping?purchased=false')));
    expect(open.data).toHaveLength(0);
  });

  it('rejects bad filters and empty updates', async () => {
    expect((await shopping.GET(request('/api/shopping?purchased=maybe'))).status).toBe(400);
    expect((await shoppingById.PATCH(request('/api/shopping/1', { method: 'PATCH', body: {} }), idContext(1))).status).toBe(400);
  });
});

describe('settings', () => {
  it('reads and partially updates settings', async () => {
    const before = await json<LawnSettings>(await settings.GET());
    expect(before.data).toMatchObject({
      city: YARD.location.city,
      state: YARD.location.state,
      usda_zone: YARD.location.usda_zone,
      latitude: YARD.location.latitude,
      longitude: YARD.location.longitude,
      total_sqft: YARD.yard.total_sqft,
      mower_brand: YARD.equipment.mower_brand,
      mower_model: YARD.equipment.mower_model,
    });

    const after = await json<LawnSettings>(
      await settings.PUT(request('/api/settings', { method: 'PUT', body: { shade_percentage: 60, state: 'zz' } })),
    );
    expect(after.data).toMatchObject({ shade_percentage: 60, state: 'ZZ', total_sqft: before.data?.total_sqft });
  });

  it('rejects unknown fields instead of ignoring them', async () => {
    const res = await settings.PUT(request('/api/settings', { method: 'PUT', body: { id: 7 } }));
    expect(res.status).toBe(400);
  });
});

describe('dashboard and health', () => {
  it('summarises the season', async () => {
    const body = await json<DashboardSummary>(await dashboard.GET());
    expect(body.data?.season.phase).toMatch(/before|in-season|after/);
    expect(Array.isArray(body.data?.schedule_warnings)).toBe(true);
    expect(body.data?.unsafe_products).toEqual([]);
  });

  it('weather degrades to a clear 503 when offline', async () => {
    const res = await weather.GET();
    expect(res.status).toBe(503);
    expect((await json(res)).error?.code).toBe('weather_unavailable');
  });

  it('reports the schema version', async () => {
    const body = await json<{ schema_version: number }>(await health.GET());
    expect(body.data?.schema_version).toBe(LATEST_SCHEMA_VERSION);
  });
});
