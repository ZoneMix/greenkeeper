import type { ApiErrorDetail } from '@/lib/domain/types';

export type ErrorCode =
  | 'validation_error'
  | 'invalid_json'
  | 'not_found'
  | 'conflict'
  | 'unsafe_product'
  | 'weather_unavailable'
  | 'server_error';

/** An expected failure with a stable code; the handler maps it to a response. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: ReadonlyArray<ApiErrorDetail>;

  constructor(code: ErrorCode, status: number, message: string, details?: ReadonlyArray<ApiErrorDetail>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const notFound = (what: string): AppError => new AppError('not_found', 404, `${what} not found`);

export const validationError = (message: string, details?: ReadonlyArray<ApiErrorDetail>): AppError =>
  new AppError('validation_error', 400, message, details);
