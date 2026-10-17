import { loadConfig } from '@/server/config';
import { getDb } from '@/server/database';
import { handle } from '@/server/http/handler';
import { ok } from '@/server/http/responses';
import { getWeather } from '@/server/services/weather';

/**
 * 7-day Open-Meteo forecast for the lawn's coordinates plus timing notes for upcoming
 * tasks. Cached for 30 minutes; serves stale data (flagged) for up to 12 hours if the
 * provider is down, otherwise 503 weather_unavailable. Never needs an API key.
 */
export const GET = handle(async () => {
  const { weatherEnabled } = loadConfig();
  return ok(await getWeather(getDb(), { enabled: weatherEnabled, now: new Date() }));
});
