import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScheduleTask, WeatherDay } from '@/lib/domain/types';
import { YARD } from '@/lib/domain/yard-config';
import { adviseTasks } from '@/lib/domain/weather-advice';
import { connect } from '@/server/db/connection';
import { migrate } from '@/server/db/migrate';
import type { Db } from '@/server/db/types';
import { AppError } from '@/server/http/errors';
import { getWeather, resetWeatherState } from '@/server/services/weather';
import { forecastUrl, parseForecast } from '@/server/weather/open-meteo';

const TODAY = '2027-04-10';
const { latitude: LAT, longitude: LON, timezone: TIMEZONE } = YARD.location;

function day(date: string, overrides: Partial<WeatherDay> = {}): WeatherDay {
  return {
    date,
    weather_code: 0,
    condition: 'Clear',
    high_f: 65,
    low_f: 45,
    precip_in: 0,
    precip_chance: 0,
    wind_max_mph: 8,
    soil_temp_f: 56,
    ...overrides,
  };
}

const WEEK = ['2027-04-10', '2027-04-11', '2027-04-12', '2027-04-13', '2027-04-14', '2027-04-15', '2027-04-16'].map((d) => day(d));

function task(overrides: Partial<ScheduleTask> & Pick<ScheduleTask, 'id' | 'title' | 'category'>): ScheduleTask {
  return {
    description: '',
    scheduled_date: TODAY,
    completed_date: null,
    status: 'pending',
    notes: null,
    product_id: null,
    zone: 'both',
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

function withDay(date: string, overrides: Partial<WeatherDay>): ReadonlyArray<WeatherDay> {
  return WEEK.map((d) => (d.date === date ? { ...d, ...overrides } : d));
}

describe('adviseTasks', () => {
  const corn = task({ id: 1, title: 'Apply pre-emergent (corn gluten meal)', category: 'weed-control' });

  it('holds corn gluten until soil reaches 55°F and approves it after', () => {
    const cold = adviseTasks([corn], withDay(TODAY, { soil_temp_f: 44 }), TODAY);
    expect(cold[0]).toMatchObject({ level: 'hold', headline: 'Consider another day' });
    expect(cold[0]?.reasons[0]).toMatch(/44°F/);

    const warm = adviseTasks([corn], WEEK, TODAY);
    expect(warm[0]?.level).toBe('good');
  });

  it('warns about heavy rain on a fertilizer day and credits light rain for watering in', () => {
    const feed = task({ id: 2, title: 'Spring fertilizer', category: 'fertilizer', scheduled_date: '2027-04-12' });
    expect(adviseTasks([feed], withDay('2027-04-12', { precip_in: 1.3 }), TODAY)[0]?.level).toBe('hold');
    const soak = adviseTasks([feed], withDay('2027-04-13', { precip_in: 0.3 }), TODAY)[0];
    expect(soak?.level).toBe('good');
    expect(soak?.reasons[0]).toMatch(/Light rain Tue/);
  });

  it('skips watering when a week of rain covers 1 inch', () => {
    const water = task({ id: 3, title: 'Deep watering', category: 'watering', scheduled_date: '2027-04-11' });
    const rainy = WEEK.map((d) => ({ ...d, precip_in: 0.2 }));
    expect(adviseTasks([water], rainy, TODAY)[0]?.level).toBe('hold');
  });

  it('flags frost and cold soil for seeding', () => {
    const seed = task({ id: 4, title: 'Overseed', category: 'overseeding' });
    const advice = adviseTasks([seed], withDay(TODAY, { soil_temp_f: 40, low_f: 28 }), TODAY)[0];
    expect(advice?.level).toBe('caution');
    expect(advice?.reasons.join(' ')).toMatch(/slow to germinate.*Frost/);
  });

  it('judges recently overdue tasks against today and ignores far-off or finished ones', () => {
    const overdue = task({ id: 5, title: 'Mow', category: 'mowing', scheduled_date: '2027-04-05' });
    const later = task({ id: 6, title: 'Mow', category: 'mowing', scheduled_date: '2027-05-30' });
    const done = task({ id: 7, title: 'Mow', category: 'mowing', status: 'completed' });
    const ancient = task({ id: 8, title: 'Mow', category: 'mowing', scheduled_date: '2027-03-01' });
    const advice = adviseTasks([overdue, later, done, ancient], WEEK, TODAY);
    expect(advice.map((a) => a.task_id)).toEqual([5]);
  });

  it('says nothing for tasks with no weather angle', () => {
    expect(adviseTasks([task({ id: 9, title: 'Soil test', category: 'soil-test' })], WEEK, TODAY)).toEqual([]);
  });
});

const RAW = {
  current: { time: '2027-04-10T14:00', temperature_2m: 58.8, weather_code: 2, wind_speed_10m: 12, precipitation: 0 },
  daily: {
    time: ['2027-04-10', '2027-04-11'],
    weather_code: [2, 61],
    temperature_2m_max: [61.4, 55],
    temperature_2m_min: [32.7, 40],
    precipitation_sum: [0, 0.4],
    precipitation_probability_max: [5, 80],
    wind_speed_10m_max: [20, 10],
  },
  hourly: {
    time: ['2027-04-10T00:00', '2027-04-10T12:00', '2027-04-11T00:00'],
    soil_temperature_6cm: [40, 50, null],
  },
};

describe('Open-Meteo client', () => {
  it('builds a keyless request in Fahrenheit, inches and local time', () => {
    const url = new URL(forecastUrl(LAT, LON));
    expect(url.hostname).toBe('api.open-meteo.com');
    expect(url.searchParams.get('temperature_unit')).toBe('fahrenheit');
    expect(url.searchParams.get('timezone')).toBe(TIMEZONE);
    expect([...url.searchParams.keys()].some((k) => /key|token/i.test(k))).toBe(false);
  });

  it('parses and averages soil temperature per day', () => {
    const report = parseForecast(RAW, LAT, LON, new Date('2027-04-10T19:00:00Z'));
    expect(report.current.condition).toBe('Partly cloudy');
    expect(report.days[0]).toMatchObject({ soil_temp_f: 45, precip_chance: 5 });
    expect(report.days[1]).toMatchObject({ condition: 'Light rain', soil_temp_f: null });
  });

  it('rejects unexpected payloads', () => {
    expect(() => parseForecast({ nope: true }, LAT, LON, new Date())).toThrow(/unexpected payload/);
  });
});

describe('getWeather', () => {
  let db: Db;
  const okFetch = vi.fn(async () => Response.json(RAW));
  const failingFetch = vi.fn(async () => {
    throw new Error('offline');
  });
  const now = new Date('2027-04-10T19:00:00Z');
  const later = (ms: number): Date => new Date(now.getTime() + ms);

  beforeEach(() => {
    resetWeatherState();
    vi.clearAllMocks();
    db = connect(':memory:');
    migrate(db);
  });
  afterEach(() => db.close());

  it('fetches once and serves the cache while fresh', async () => {
    await getWeather(db, { enabled: true, now, fetchImpl: okFetch });
    const second = await getWeather(db, { enabled: true, now: later(10 * 60 * 1000), fetchImpl: okFetch });
    expect(okFetch).toHaveBeenCalledTimes(1);
    expect(second.report.stale).toBe(false);
  });

  it('falls back to stale cache when the provider fails, then backs off', async () => {
    await getWeather(db, { enabled: true, now, fetchImpl: okFetch });
    const stale = await getWeather(db, { enabled: true, now: later(60 * 60 * 1000), fetchImpl: failingFetch });
    expect(stale.report.stale).toBe(true);
    await getWeather(db, { enabled: true, now: later(61 * 60 * 1000), fetchImpl: failingFetch });
    expect(failingFetch).toHaveBeenCalledTimes(1);
  });

  it('returns a 503 AppError with no cache and no provider', async () => {
    await expect(getWeather(db, { enabled: true, now, fetchImpl: failingFetch })).rejects.toBeInstanceOf(AppError);
    await expect(getWeather(db, { enabled: false, now })).rejects.toMatchObject({ code: 'weather_unavailable', status: 503 });
  });

  it('gives up on cache older than 12 hours', async () => {
    await getWeather(db, { enabled: true, now, fetchImpl: okFetch });
    await expect(getWeather(db, { enabled: false, now: later(13 * 60 * 60 * 1000) })).rejects.toMatchObject({ status: 503 });
  });
});
