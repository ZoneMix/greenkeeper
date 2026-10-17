import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import * as generate from '@/app/api/shopping/generate/route';
import type { ShoppingGenerateResult } from '@/lib/domain/types';
import { closeDb } from '@/server/database';
import { json, request, useTempDatabase } from '../helpers/api';

beforeEach(() => {
  useTempDatabase();
});
afterAll(() => closeDb());

describe('POST /api/shopping/generate', () => {
  it('accepts an empty body and returns the plan envelope', async () => {
    const res = await generate.POST(request('/api/shopping/generate', { method: 'POST' }));
    const body = await json<ShoppingGenerateResult>(res);
    expect(res.status).toBe(200);
    expect(body.data).toMatchObject({ dry_run: false });
    expect(Array.isArray(body.data?.items)).toBe(true);
    expect(typeof body.data?.message).toBe('string');
  });

  it('previews a full season without writing', async () => {
    const res = await generate.POST(request('/api/shopping/generate', { method: 'POST', body: { horizon_days: 120, dry_run: true } }));
    const body = await json<ShoppingGenerateResult>(res);
    expect(body.data?.created).toBe(0);
    expect(body.data?.items.every((item) => item.quantity_needed >= 0)).toBe(true);
  });

  it('validates the body', async () => {
    const res = await generate.POST(request('/api/shopping/generate', { method: 'POST', body: { horizon_days: 0 } }));
    expect(res.status).toBe(400);
    expect((await json(res)).error?.details?.[0]?.field).toBe('horizon_days');
  });
});
