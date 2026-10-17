// Calls App Router handlers directly with real Request objects against a temp DB.

import { closeDb } from '@/server/database';
import { tempDbPath } from './legacy-db';

const BASE_URL = 'http://greenkeeper.test';

/** Points the app at a fresh temp database file; call in beforeEach. */
export function useTempDatabase(): string {
  closeDb();
  const dbPath = tempDbPath();
  process.env.LAWN_DB_PATH = dbPath;
  return dbPath;
}

export function request(path: string, init: { method?: string; body?: unknown; rawBody?: string } = {}): Request {
  const body = init.rawBody ?? (init.body === undefined ? undefined : JSON.stringify(init.body));
  return new Request(`${BASE_URL}${path}`, {
    method: init.method ?? 'GET',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body,
  });
}

export function idContext(id: number | string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: String(id) }) };
}

export interface Envelope<T> {
  readonly data?: T;
  readonly meta?: { readonly total: number };
  readonly error?: { readonly code: string; readonly message: string; readonly details?: ReadonlyArray<{ field: string; message: string }> };
}

export async function json<T>(response: Response): Promise<Envelope<T>> {
  return (await response.json()) as Envelope<T>;
}
