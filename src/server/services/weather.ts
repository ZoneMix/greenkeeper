import { todayIso } from '@/lib/domain/dates';
import type { WeatherReport, WeatherResponse } from '@/lib/domain/types';
import { adviseTasks } from '@/lib/domain/weather-advice';
import type { Db } from '../db/types';
import { AppError } from '../http/errors';
import { logger } from '../logger';
import { getSettings } from '../repositories/settings';
import { listTasks } from '../repositories/tasks';
import { FRESH_MS, STALE_MAX_MS, cacheKey, readCache, writeCache } from '../weather/cache';
import { fetchForecast, type FetchLike } from '../weather/open-meteo';

/** After a failed fetch, wait this long before trying the provider again. */
export const RETRY_AFTER_FAILURE_MS = 2 * 60 * 1000;

export interface WeatherDeps {
  readonly enabled: boolean;
  readonly now: Date;
  readonly fetchImpl?: FetchLike;
}

// Per-process state: one in-flight request per location and a short failure backoff.
const inFlight = new Map<string, Promise<WeatherReport>>();
const lastFailure = new Map<string, number>();

export function resetWeatherState(): void {
  inFlight.clear();
  lastFailure.clear();
}

function unavailable(reason: string): AppError {
  return new AppError('weather_unavailable', 503, `Weather is unavailable right now (${reason}). Tasks still work without it.`);
}

async function refresh(db: Db, key: string, latitude: number, longitude: number, deps: WeatherDeps): Promise<WeatherReport> {
  const pending =
    inFlight.get(key) ??
    fetchForecast(latitude, longitude, deps.fetchImpl, deps.now).finally(() => inFlight.delete(key));
  inFlight.set(key, pending);
  const report = await pending;
  writeCache(db, key, report, deps.now.getTime());
  lastFailure.delete(key);
  return report;
}

async function loadReport(db: Db, deps: WeatherDeps): Promise<WeatherReport> {
  const { latitude, longitude } = getSettings(db);
  const key = cacheKey(latitude, longitude);
  const cached = readCache(db, key);
  const age = cached ? deps.now.getTime() - cached.fetchedAt : Number.POSITIVE_INFINITY;
  const staleFallback = (reason: string): WeatherReport => {
    if (cached && age <= STALE_MAX_MS) return { ...cached.report, stale: true };
    throw unavailable(reason);
  };

  if (cached && age <= FRESH_MS) return cached.report;
  if (!deps.enabled) return staleFallback('weather lookups are disabled');
  const failedAt = lastFailure.get(key);
  if (failedAt !== undefined && deps.now.getTime() - failedAt < RETRY_AFTER_FAILURE_MS) {
    return staleFallback('provider recently failed');
  }

  try {
    return await refresh(db, key, latitude, longitude, deps);
  } catch (error: unknown) {
    lastFailure.set(key, deps.now.getTime());
    logger.warn('Weather refresh failed', error);
    return staleFallback('provider unreachable');
  }
}

export async function getWeather(db: Db, deps: WeatherDeps): Promise<WeatherResponse> {
  const report = await loadReport(db, deps);
  const today = todayIso(deps.now);
  const advice = adviseTasks(listTasks(db, { status: 'pending' }), report.days, today);
  return { report, advice };
}
