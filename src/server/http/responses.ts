// Response envelope used by every route: { data, meta? } on success and
// { error: { code, message, details } } on failure (details is [] when there are none).

import type { ApiErrorBody, ApiErrorDetail } from '@/lib/domain/types';
import type { ErrorCode } from './errors';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export function ok<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status, headers: NO_STORE });
}

export function okList<T>(items: ReadonlyArray<T>, status = 200): Response {
  return Response.json({ data: items, meta: { total: items.length } }, { status, headers: NO_STORE });
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  status: number,
  details?: ReadonlyArray<ApiErrorDetail>,
): Response {
  const body: ApiErrorBody = { error: { code, message, details: details ?? [] } };
  return Response.json(body, { status, headers: NO_STORE });
}
