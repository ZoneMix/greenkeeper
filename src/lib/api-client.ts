// Typed fetch wrapper for the browser. Every page goes through this, never raw fetch.

import type { z } from 'zod';
import type {
  inventoryCreateSchema,
  inventoryUpdateSchema,
  productCreateSchema,
  settingsUpdateSchema,
  shoppingCreateSchema,
  shoppingGenerateSchema,
  shoppingUpdateSchema,
  taskCreateSchema,
  taskUpdateSchema,
} from './domain/schemas';
import type {
  ApiErrorBody,
  ApiErrorDetail,
  DashboardSummary,
  InventoryItem,
  LawnSettings,
  Product,
  ScheduleTask,
  ScheduleTaskWithProduct,
  ShoppingGenerateResult,
  ShoppingItem,
  WeatherResponse,
} from './domain/types';

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ReadonlyArray<ApiErrorDetail>;

  constructor(status: number, code: string, message: string, details: ReadonlyArray<ApiErrorDetail> = []) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return typeof value === 'object' && value !== null && 'error' in value && typeof value.error === 'object';
}

async function request<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: init?.method ?? 'GET',
      headers: init?.body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      cache: 'no-store',
    });
  } catch {
    throw new ApiClientError(0, 'network_error', 'Could not reach Greenkeeper. Check that the app is running.');
  }
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (isErrorBody(json)) {
      throw new ApiClientError(response.status, json.error.code, json.error.message, json.error.details);
    }
    throw new ApiClientError(response.status, 'http_error', `Request failed (${response.status})`);
  }
  if (typeof json !== 'object' || json === null || !('data' in json)) {
    throw new ApiClientError(response.status, 'bad_response', 'Unexpected response from the server');
  }
  return json.data as T;
}

/** Human-readable message for any thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    const detail = error.details[0];
    return detail && error.code === 'validation_error' ? `${error.message}: ${detail.field} — ${detail.message}` : error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}

function query(params: Readonly<Record<string, string | number | boolean | undefined>>): string {
  const entries = Object.entries(params).filter((entry): entry is [string, string | number | boolean] => entry[1] !== undefined && entry[1] !== '');
  return entries.length === 0 ? '' : `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()}`;
}

type In<S extends z.ZodType> = z.input<S>;
type Deleted = { readonly deleted: true; readonly id: number };

export interface TaskQuery {
  readonly status?: ScheduleTask['status'];
  readonly category?: ScheduleTask['category'];
  readonly month?: string;
  readonly from?: string;
  readonly to?: string;
  readonly limit?: number;
}

export const api = {
  dashboard: () => request<DashboardSummary>('/api/dashboard'),
  weather: () => request<WeatherResponse>('/api/weather'),
  settings: {
    get: () => request<LawnSettings>('/api/settings'),
    update: (body: In<typeof settingsUpdateSchema>) => request<LawnSettings>('/api/settings', { method: 'PUT', body }),
  },
  tasks: {
    list: (params: TaskQuery = {}) => request<ReadonlyArray<ScheduleTask>>(`/api/tasks${query({ ...params })}`),
    get: (id: number) => request<ScheduleTaskWithProduct>(`/api/tasks/${id}`),
    create: (body: In<typeof taskCreateSchema>) => request<ScheduleTask>('/api/tasks', { method: 'POST', body }),
    update: (id: number, body: In<typeof taskUpdateSchema>) =>
      request<ScheduleTask>(`/api/tasks/${id}`, { method: 'PATCH', body }),
    remove: (id: number) => request<Deleted>(`/api/tasks/${id}`, { method: 'DELETE' }),
    planSeason: (year: number) =>
      request<{ year: number; created: ReadonlyArray<ScheduleTask>; skipped: number }>('/api/season/plan', {
        method: 'POST',
        body: { year },
      }),
  },
  products: {
    list: (params: { category?: Product['category']; search?: string } = {}) =>
      request<ReadonlyArray<Product>>(`/api/products${query(params)}`),
    create: (body: In<typeof productCreateSchema>) => request<Product>('/api/products', { method: 'POST', body }),
  },
  inventory: {
    list: () => request<ReadonlyArray<InventoryItem>>('/api/inventory'),
    create: (body: In<typeof inventoryCreateSchema>) => request<InventoryItem>('/api/inventory', { method: 'POST', body }),
    update: (id: number, body: In<typeof inventoryUpdateSchema>) =>
      request<InventoryItem>(`/api/inventory/${id}`, { method: 'PATCH', body }),
    remove: (id: number) => request<Deleted>(`/api/inventory/${id}`, { method: 'DELETE' }),
  },
  shopping: {
    list: () => request<ReadonlyArray<ShoppingItem>>('/api/shopping'),
    create: (body: In<typeof shoppingCreateSchema>) => request<ShoppingItem>('/api/shopping', { method: 'POST', body }),
    update: (id: number, body: In<typeof shoppingUpdateSchema>) =>
      request<ShoppingItem>(`/api/shopping/${id}`, { method: 'PATCH', body }),
    remove: (id: number) => request<Deleted>(`/api/shopping/${id}`, { method: 'DELETE' }),
    generate: (body: In<typeof shoppingGenerateSchema> = {}) =>
      request<ShoppingGenerateResult>('/api/shopping/generate', { method: 'POST', body }),
  },
} as const;
