// Calendar-day helpers. Dates are plain 'YYYY-MM-DD' strings in the yard's local
// time (APP_TIMEZONE); arithmetic runs in UTC so DST never shifts a day.

import { APP_TIMEZONE } from './constants';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return date.toISOString().slice(0, 10) === value;
}

/** Today's calendar date in the app timezone (not UTC). */
export function todayIso(now: Date = new Date(), timeZone: string = APP_TIMEZONE): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function toUtc(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(iso: string, days: number): string {
  return new Date(toUtc(iso) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((toUtc(toIso) - toUtc(fromIso)) / MS_PER_DAY);
}

export function isoFromParts(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function yearOf(iso: string): number {
  return Number(iso.slice(0, 4));
}

/** Formats an ISO date for display without timezone drift. */
export function formatDate(iso: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string {
  return new Date(toUtc(iso)).toLocaleDateString('en-US', { ...options, timeZone: 'UTC' });
}

export function weekdayShort(iso: string): string {
  return formatDate(iso, { weekday: 'short' });
}
