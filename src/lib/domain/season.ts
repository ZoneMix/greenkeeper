import { SEASON } from './constants';
import { daysBetween, formatDate, isoFromParts, yearOf } from './dates';
import type { ScheduleTask, SeasonStatus, TaskDisplayStatus } from './types';

/** Any non-leap year works: the labels show month and day only. */
const LABEL_YEAR = 2001;

function seasonDay(month: number, day: number, style: 'short' | 'long'): string {
  return formatDate(isoFromParts(LABEL_YEAR, month, day), { month: style, day: 'numeric' });
}

/** e.g. "Apr 1 – Nov 10". */
export const SEASON_RANGE_SHORT =
  `${seasonDay(SEASON.startMonth, SEASON.startDay, 'short')} – ${seasonDay(SEASON.endMonth, SEASON.endDay, 'short')}`;

/** e.g. "April 1 to November 10". */
export const SEASON_RANGE_LONG =
  `${seasonDay(SEASON.startMonth, SEASON.startDay, 'long')} to ${seasonDay(SEASON.endMonth, SEASON.endDay, 'long')}`;

export function seasonBounds(year: number): { readonly start: string; readonly end: string } {
  return {
    start: isoFromParts(year, SEASON.startMonth, SEASON.startDay),
    end: isoFromParts(year, SEASON.endMonth, SEASON.endDay),
  };
}

/** Where `today` sits in this calendar year's growing season. */
export function seasonStatus(today: string): SeasonStatus {
  const year = yearOf(today);
  const { start, end } = seasonBounds(year);
  const total = daysBetween(start, end);

  if (today < start) {
    return { year, phase: 'before', progress: 0, start, end, days_remaining: total };
  }
  if (today > end) {
    return { year, phase: 'after', progress: 100, start, end, days_remaining: 0 };
  }
  const elapsed = daysBetween(start, today);
  return {
    year,
    phase: 'in-season',
    progress: Math.round((elapsed / total) * 100),
    start,
    end,
    days_remaining: daysBetween(today, end),
  };
}

/** The season worth planning: this year's until it ends, then next year's. */
export function planningYear(today: string): number {
  const year = yearOf(today);
  return today > seasonBounds(year).end ? year + 1 : year;
}

export function isInSeason(iso: string): boolean {
  const { start, end } = seasonBounds(yearOf(iso));
  return iso >= start && iso <= end;
}

export function taskDisplayStatus(
  task: Pick<ScheduleTask, 'status' | 'scheduled_date'>,
  today: string,
): TaskDisplayStatus {
  if (task.status === 'pending' && task.scheduled_date < today) return 'overdue';
  return task.status;
}
