import { describe, expect, it } from 'vitest';
import { APP_TIMEZONE } from '@/lib/domain/constants';
import { addDays, daysBetween, isIsoDate, isoFromParts, todayIso } from '@/lib/domain/dates';
import { checkSchedule, isPreEmergent } from '@/lib/domain/schedule-rules';
import { planningYear, seasonBounds, seasonStatus, taskDisplayStatus } from '@/lib/domain/season';
import type { ScheduleTask } from '@/lib/domain/types';
import { YARD } from '@/lib/domain/yard-config';
import { completedDateFor } from '@/server/services/tasks';

function task(overrides: Partial<ScheduleTask>): ScheduleTask {
  return {
    id: 1,
    title: 'Task',
    description: '',
    category: 'mowing',
    scheduled_date: '2026-06-01',
    completed_date: null,
    status: 'pending',
    notes: null,
    product_id: null,
    zone: 'both',
    created_at: '2026-01-01 00:00:00',
    updated_at: '2026-01-01 00:00:00',
    ...overrides,
  };
}

describe('dates', () => {
  it('validates real calendar dates only', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026-2-3')).toBe(false);
  });

  it('uses local time in the given zone, not UTC, for today', () => {
    const instant = new Date('2026-10-18T03:30:00Z');
    // Still the evening of Oct 17 at UTC-12, already Oct 18 at UTC+14.
    expect(todayIso(instant, 'Etc/GMT+12')).toBe('2026-10-17');
    expect(todayIso(instant, 'Etc/GMT-14')).toBe('2026-10-18');
  });

  it("defaults to the yard's time zone", () => {
    const instant = new Date('2026-10-18T03:30:00Z');
    expect(APP_TIMEZONE).toBe(YARD.location.timezone);
    expect(todayIso(instant)).toBe(todayIso(instant, YARD.location.timezone));
  });

  it('does day arithmetic across DST changes', () => {
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09');
    expect(daysBetween('2026-11-01', '2026-11-02')).toBe(1);
  });
});

describe('season', () => {
  const { start, end } = seasonBounds(2026);

  it("takes its bounds from the yard config's season", () => {
    const { season } = YARD;
    expect(start).toBe(isoFromParts(2026, season.startMonth, season.startDay));
    expect(end).toBe(isoFromParts(2026, season.endMonth, season.endDay));
  });

  it('reports progress through the season', () => {
    expect(seasonStatus(addDays(start, -1))).toMatchObject({ phase: 'before', progress: 0 });
    expect(seasonStatus(start)).toMatchObject({ phase: 'in-season', progress: 0 });
    expect(seasonStatus(end)).toMatchObject({ phase: 'in-season', progress: 100, days_remaining: 0 });
    expect(seasonStatus(addDays(end, 1))).toMatchObject({ phase: 'after', progress: 100 });
  });

  it('plans the next year only after the season ends', () => {
    expect(planningYear(end)).toBe(2026);
    expect(planningYear(addDays(end, 1))).toBe(2027);
  });

  it('marks past pending tasks overdue', () => {
    expect(taskDisplayStatus(task({ scheduled_date: '2026-06-01' }), '2026-06-02')).toBe('overdue');
    expect(taskDisplayStatus(task({ status: 'completed' }), '2026-12-01')).toBe('completed');
    expect(taskDisplayStatus(task({}), '2026-06-01')).toBe('pending');
  });
});

describe('checkSchedule', () => {
  const preEmergent = task({ id: 10, title: 'Second pre-emergent', category: 'weed-control', scheduled_date: '2026-08-15', zone: 'front' });
  const seeding = task({ id: 11, title: 'Heavy overseed', category: 'overseeding', scheduled_date: '2026-09-07', zone: 'both' });

  it('flags a pre-emergent less than six weeks before overseeding in the same zone', () => {
    const warnings = checkSchedule([preEmergent, seeding]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ kind: 'pre-emergent-before-overseeding', task_ids: [10, 11] });
  });

  it('ignores different zones, wide gaps and finished tasks', () => {
    expect(checkSchedule([preEmergent, { ...seeding, zone: 'back' }])).toEqual([]);
    expect(checkSchedule([{ ...preEmergent, scheduled_date: '2026-07-20' }, seeding])).toEqual([]);
    expect(checkSchedule([{ ...preEmergent, status: 'skipped' }, seeding])).toEqual([]);
  });

  it('flags pending tasks outside the growing season', () => {
    const warnings = checkSchedule([task({ id: 5, scheduled_date: addDays(seasonBounds(2026).end, 21) })]);
    expect(warnings).toEqual([expect.objectContaining({ kind: 'out-of-season', task_ids: [5] })]);
  });

  it('recognises pre-emergents by title', () => {
    expect(isPreEmergent({ category: 'weed-control', title: 'Apply corn gluten meal' })).toBe(true);
    expect(isPreEmergent({ category: 'weed-control', title: 'Spot-treat broadleaf weeds' })).toBe(false);
  });
});

describe('completedDateFor', () => {
  const pending = task({});
  const done = task({ status: 'completed', completed_date: '2026-05-01' });

  it('stamps today on completion and keeps an existing stamp', () => {
    expect(completedDateFor(pending, 'completed', '2026-06-02')).toBe('2026-06-02');
    expect(completedDateFor(done, 'completed', '2026-06-02')).toBe('2026-05-01');
  });

  it('clears the stamp when reopened or skipped and leaves it alone otherwise', () => {
    expect(completedDateFor(done, 'pending', '2026-06-02')).toBeNull();
    expect(completedDateFor(done, 'skipped', '2026-06-02')).toBeNull();
    expect(completedDateFor(done, undefined, '2026-06-02')).toBe('2026-05-01');
  });
});
