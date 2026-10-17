// Open-Meteo forecast client. Free, keyless and CORS-friendly: no secret is ever
// needed. Responses are validated with zod before use.

import { z } from 'zod';
import { APP_TIMEZONE } from '@/lib/domain/constants';
import type { WeatherDay, WeatherReport } from '@/lib/domain/types';
import { describeWeatherCode } from '@/lib/domain/weather-codes';

export const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const FORECAST_DAYS = 7;
const REQUEST_TIMEOUT_MS = 6_000;

const numberArray = z.array(z.number().nullable());

const responseSchema = z.object({
  current: z.object({
    time: z.string(),
    temperature_2m: z.number(),
    weather_code: z.number(),
    wind_speed_10m: z.number(),
    precipitation: z.number(),
  }),
  daily: z.object({
    time: z.array(z.string()),
    weather_code: numberArray,
    temperature_2m_max: numberArray,
    temperature_2m_min: numberArray,
    precipitation_sum: numberArray,
    precipitation_probability_max: numberArray,
    wind_speed_10m_max: numberArray,
  }),
  hourly: z.object({
    time: z.array(z.string()),
    soil_temperature_6cm: numberArray,
  }),
});

type OpenMeteoResponse = z.infer<typeof responseSchema>;

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export class WeatherFetchError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'WeatherFetchError';
  }
}

export function forecastUrl(latitude: number, longitude: number): string {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current: 'temperature_2m,weather_code,wind_speed_10m,precipitation',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max',
    hourly: 'soil_temperature_6cm',
    temperature_unit: 'fahrenheit',
    precipitation_unit: 'inch',
    wind_speed_unit: 'mph',
    timezone: APP_TIMEZONE,
    forecast_days: String(FORECAST_DAYS),
  });
  return `${OPEN_METEO_URL}?${params.toString()}`;
}

function dailySoilMeans(hourly: OpenMeteoResponse['hourly']): ReadonlyMap<string, number> {
  const sums = new Map<string, { total: number; count: number }>();
  hourly.time.forEach((time, index) => {
    const value = hourly.soil_temperature_6cm[index];
    if (value === null || value === undefined) return;
    const date = time.slice(0, 10);
    const current = sums.get(date) ?? { total: 0, count: 0 };
    sums.set(date, { total: current.total + value, count: current.count + 1 });
  });
  return new Map([...sums].map(([date, { total, count }]) => [date, Math.round((total / count) * 10) / 10]));
}

function toDays(raw: OpenMeteoResponse): ReadonlyArray<WeatherDay> {
  const soil = dailySoilMeans(raw.hourly);
  const at = (values: ReadonlyArray<number | null>, index: number): number | null => values[index] ?? null;
  return raw.daily.time.map((date, index) => {
    const code = at(raw.daily.weather_code, index) ?? 3;
    return {
      date,
      weather_code: code,
      condition: describeWeatherCode(code),
      high_f: at(raw.daily.temperature_2m_max, index) ?? Number.NaN,
      low_f: at(raw.daily.temperature_2m_min, index) ?? Number.NaN,
      precip_in: at(raw.daily.precipitation_sum, index) ?? 0,
      precip_chance: at(raw.daily.precipitation_probability_max, index),
      wind_max_mph: at(raw.daily.wind_speed_10m_max, index) ?? 0,
      soil_temp_f: soil.get(date) ?? null,
    };
  }).filter((day) => Number.isFinite(day.high_f) && Number.isFinite(day.low_f));
}

export function parseForecast(json: unknown, latitude: number, longitude: number, fetchedAt: Date): WeatherReport {
  const parsed = responseSchema.safeParse(json);
  if (!parsed.success) throw new WeatherFetchError('Open-Meteo returned an unexpected payload', { cause: parsed.error });
  const raw = parsed.data;
  return {
    source: 'open-meteo',
    latitude,
    longitude,
    current: {
      time: raw.current.time,
      temperature_f: raw.current.temperature_2m,
      weather_code: raw.current.weather_code,
      condition: describeWeatherCode(raw.current.weather_code),
      wind_mph: raw.current.wind_speed_10m,
      precip_in: raw.current.precipitation,
    },
    days: toDays(raw),
    fetched_at: fetchedAt.toISOString(),
    stale: false,
  };
}

export async function fetchForecast(
  latitude: number,
  longitude: number,
  fetchImpl: FetchLike = fetch,
  now: Date = new Date(),
): Promise<WeatherReport> {
  let response: Response;
  try {
    response = await fetchImpl(forecastUrl(latitude, longitude), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (error: unknown) {
    throw new WeatherFetchError('Could not reach Open-Meteo', { cause: error });
  }
  if (!response.ok) throw new WeatherFetchError(`Open-Meteo responded ${response.status}`);
  let json: unknown;
  try {
    json = await response.json();
  } catch (error: unknown) {
    throw new WeatherFetchError('Open-Meteo returned invalid JSON', { cause: error });
  }
  return parseForecast(json, latitude, longitude, now);
}
