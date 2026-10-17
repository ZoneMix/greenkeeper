import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import * as taskById from '@/app/api/tasks/[id]/route';
import * as tasks from '@/app/api/tasks/route';
import * as seasonPlan from '@/app/api/season/plan/route';
import type { ScheduleTask, ScheduleTaskWithProduct } from '@/lib/domain/types';
import { closeDb, getDb } from '@/server/database';
import { idContext, json, request, useTempDatabase } from '../helpers/api';

beforeEach(() => {
  useTempDatabase();
});
afterAll(() => closeDb());

const newTask = { title: 'Edge the walk', category: 'mowing', scheduled_date: '2027-06-03' };

describe('GET /api/tasks', () => {
  it('lists seeded tasks with a total', async () => {
    const res = await tasks.GET(request('/api/tasks'));
    const body = await json<ReadonlyArray<ScheduleTask>>(res);
    expect(res.status).toBe(200);
    expect(body.meta?.total).toBe(body.data?.length);
    expect(body.data?.length).toBeGreaterThan(0);
  });

  it('filters by status and limit', async () => {
    const body = await json<ReadonlyArray<ScheduleTask>>(await tasks.GET(request('/api/tasks?status=pending&limit=2')));
    expect(body.data).toHaveLength(2);
    expect(body.data?.every((t) => t.status === 'pending')).toBe(true);
  });

  it('rejects bad query values with field details', async () => {
    const res = await tasks.GET(request('/api/tasks?status=done&month=2026-13'));
    const body = await json(res);
    expect(res.status).toBe(400);
    expect(body.error?.code).toBe('validation_error');
    expect(body.error?.details?.map((d) => d.field).sort()).toEqual(['month', 'status']);
  });
});

describe('POST /api/tasks', () => {
  it('creates a task with defaults', async () => {
    const res = await tasks.POST(request('/api/tasks', { method: 'POST', body: newTask }));
    const body = await json<ScheduleTask>(res);
    expect(res.status).toBe(201);
    expect(body.data).toMatchObject({ ...newTask, zone: 'both', status: 'pending', description: '' });
  });

  it('returns invalid_json for malformed bodies', async () => {
    const res = await tasks.POST(request('/api/tasks', { method: 'POST', rawBody: '{nope' }));
    expect(res.status).toBe(400);
    expect((await json(res)).error?.code).toBe('invalid_json');
  });

  it('refuses to link a missing or unsafe product', async () => {
    const missing = await tasks.POST(request('/api/tasks', { method: 'POST', body: { ...newTask, product_id: 9999 } }));
    expect(missing.status).toBe(400);

    getDb().exec("INSERT INTO products (id, name, brand, category, organic, kid_safe) VALUES (500, 'Synthetic', 'X', 'fertilizer', 0, 1)");
    const unsafe = await tasks.POST(request('/api/tasks', { method: 'POST', body: { ...newTask, product_id: 500 } }));
    expect(unsafe.status).toBe(422);
    expect((await json(unsafe)).error?.code).toBe('unsafe_product');
  });
});

describe('/api/tasks/[id]', () => {
  it('gets a task with its product joined', async () => {
    const res = await taskById.GET(request('/api/tasks/1'), idContext(1));
    const body = await json<ScheduleTaskWithProduct>(res);
    expect(res.status).toBe(200);
    expect(body.data?.id).toBe(1);
    expect(body.data).toHaveProperty('product');
  });

  it('completes and reopens a task, managing completed_date', async () => {
    const done = await json<ScheduleTask>(
      await taskById.PATCH(request('/api/tasks/1', { method: 'PATCH', body: { status: 'completed' } }), idContext(1)),
    );
    expect(done.data?.completed_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const reopened = await json<ScheduleTask>(
      await taskById.PATCH(request('/api/tasks/1', { method: 'PATCH', body: { status: 'pending' } }), idContext(1)),
    );
    expect(reopened.data?.completed_date).toBeNull();
  });

  it('returns 404 for unknown ids and 400 for malformed ids', async () => {
    const missing = await taskById.GET(request('/api/tasks/9999'), idContext(9999));
    expect(missing.status).toBe(404);
    expect((await json(missing)).error).toEqual({ code: 'not_found', message: 'Task not found', details: [] });
    expect((await taskById.GET(request('/api/tasks/abc'), idContext('abc'))).status).toBe(400);
    expect((await taskById.DELETE(request('/api/tasks/9999', { method: 'DELETE' }), idContext(9999))).status).toBe(404);
  });

  it('deletes a task', async () => {
    const res = await taskById.DELETE(request('/api/tasks/2', { method: 'DELETE' }), idContext(2));
    expect((await json(res)).data).toEqual({ deleted: true, id: 2 });
    expect((await taskById.GET(request('/api/tasks/2'), idContext(2))).status).toBe(404);
  });
});

describe('POST /api/season/plan', () => {
  it('plans a new year once and is safe to repeat', async () => {
    const first = await seasonPlan.POST(request('/api/season/plan', { method: 'POST', body: { year: 2030 } }));
    expect(first.status).toBe(201);
    const second = await seasonPlan.POST(request('/api/season/plan', { method: 'POST', body: { year: 2030 } }));
    expect(second.status).toBe(200);
    expect((await json<{ created: ReadonlyArray<unknown> }>(second)).data?.created).toHaveLength(0);
  });
});
