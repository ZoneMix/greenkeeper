'use client';

import { useSyncExternalStore } from 'react';
import { todayIso } from '@/lib/domain/dates';

const CHECK_INTERVAL_MS = 60_000;

// Re-read every minute so an open tab rolls over at midnight (and on tab focus).
function subscribe(onChange: () => void): () => void {
  const timer = window.setInterval(onChange, CHECK_INTERVAL_MS);
  window.addEventListener('focus', onChange);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener('focus', onChange);
  };
}

/**
 * Today's date in the yard's time zone, read on the client only. Pages are prerendered at build
 * time, so the server snapshot is null instead of a stale build date.
 */
export function useToday(): string | null {
  return useSyncExternalStore(subscribe, todayIso, () => null);
}
