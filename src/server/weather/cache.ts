// Weather cache in SQLite so a restart, or an Open-Meteo outage, still has data to show.

import { z } from 'zod';
import type { WeatherReport } from '@/lib/domain/types';
import type { Db } from '../db/types';
import { logger } from '../logger';

/** Fresh data is reused without a network call for this long. */
export const FRESH_MS = 30 * 60 * 1000;
/** On failure, cached data up to this old is shown (marked stale). */
export const STALE_MAX_MS = 12 * 60 * 60 * 1000;

export interface CachedWeather {
  readonly report: WeatherReport;
  readonly fetchedAt: number;
}

const storedSchema: z.ZodType<WeatherReport> = z.object({
  source: z.literal('open-meteo'),
  latitude: z.number(),
  longitude: z.number(),
  current: z.object({
    time: z.string(),
    temperature_f: z.number(),
    weather_code: z.number(),
    condition: z.string(),
    wind_mph: z.number(),
    precip_in: z.number(),
  }),
  days: z.array(
    z.object({
      date: z.string(),
      weather_code: z.number(),
      condition: z.string(),
      high_f: z.number(),
      low_f: z.number(),
      precip_in: z.number(),
      precip_chance: z.number().nullable(),
      wind_max_mph: z.number(),
      soil_temp_f: z.number().nullable(),
    }),
  ),
  fetched_at: z.string(),
  stale: z.boolean(),
});

export function cacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
}

export function readCache(db: Db, key: string): CachedWeather | null {
  const row = db.prepare('SELECT payload, fetched_at FROM weather_cache WHERE cache_key = ?').get(key) as
    | { payload: string; fetched_at: number }
    | undefined;
  if (!row) return null;
  try {
    const parsed = storedSchema.safeParse(JSON.parse(row.payload));
    return parsed.success ? { report: parsed.data, fetchedAt: row.fetched_at } : null;
  } catch (error: unknown) {
    logger.warn('Ignoring unreadable weather cache entry', error);
    return null;
  }
}

export function writeCache(db: Db, key: string, report: WeatherReport, fetchedAt: number): void {
  db.prepare(
    `INSERT INTO weather_cache (cache_key, payload, fetched_at) VALUES (?, ?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at`,
  ).run(key, JSON.stringify(report), fetchedAt);
}
