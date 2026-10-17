import { z } from 'zod';
import type { ApiErrorDetail } from '@/lib/domain/types';
import { idParamSchema } from '@/lib/domain/schemas';
import { logger } from '../logger';
import { AppError, validationError } from './errors';
import { errorResponse } from './responses';

const MAX_BODY_BYTES = 64 * 1024;

export interface IdRouteContext {
  readonly params: Promise<{ id: string }>;
}

function zodDetails(error: z.ZodError): ReadonlyArray<ApiErrorDetail> {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : '(body)',
    message: issue.message,
  }));
}

function isSqliteConstraint(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'string' &&
    error.code.startsWith('SQLITE_CONSTRAINT')
  );
}

/** Maps any thrown value to the standard error envelope. Unexpected errors are logged, not leaked. */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return errorResponse(error.code, error.message, error.status, error.details);
  }
  if (error instanceof z.ZodError) {
    return errorResponse('validation_error', 'Validation failed', 400, zodDetails(error));
  }
  if (isSqliteConstraint(error)) {
    return errorResponse('conflict', 'The change conflicts with existing data', 409);
  }
  logger.error('Unhandled API error', error);
  return errorResponse('server_error', 'Internal server error', 500);
}

/** Wraps a route handler so every failure path returns the standard envelope. */
export function handle<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response> | Response,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (error: unknown) {
      return toErrorResponse(error);
    }
  };
}

/** Reads and validates a JSON body. An empty body is treated as `{}`. */
export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<z.output<S>> {
  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) {
    throw new AppError('validation_error', 413, 'Request body is too large');
  }
  let json: unknown = {};
  if (text.trim().length > 0) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new AppError('invalid_json', 400, 'Request body must be valid JSON');
    }
  }
  return schema.parse(json);
}

export function parseQuery<S extends z.ZodType>(request: Request, schema: S): z.output<S> {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  return schema.parse(params);
}

export async function parseId(context: IdRouteContext): Promise<number> {
  const { id } = await context.params;
  const parsed = idParamSchema.safeParse(id);
  if (!parsed.success) throw validationError('Invalid id', [{ field: 'id', message: 'Must be a positive integer' }]);
  return parsed.data;
}
