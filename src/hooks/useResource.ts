'use client';

import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { errorMessage } from '@/lib/api-client';

export type ResourceState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: T }
  | { readonly status: 'error'; readonly message: string };

export interface Resource<T> {
  readonly state: ResourceState<T>;
  /** Data for the current key; kept on screen while the same key reloads. */
  readonly data: T | null;
  readonly reload: () => void;
}

type Stored<T> =
  | { readonly key: string; readonly status: 'ready'; readonly data: T }
  | { readonly key: string; readonly status: 'error'; readonly message: string; readonly data: T | null };

/**
 * Loads data for a key and reloads when the key changes or reload() is called.
 * Results are stored with their key, so data from a previous key is never shown.
 */
export function useResource<T>(key: string, load: () => Promise<T>): Resource<T> {
  const [stored, setStored] = useState<Stored<T> | null>(null);
  const [version, setVersion] = useState(0);
  const run = useEffectEvent(load);

  useEffect(() => {
    let cancelled = false;
    run().then(
      (data) => {
        if (!cancelled) setStored({ key, status: 'ready', data });
      },
      (error: unknown) => {
        if (cancelled) return;
        setStored((prev) => ({
          key,
          status: 'error',
          message: errorMessage(error),
          data: prev?.key === key ? prev.data : null,
        }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  if (!stored || stored.key !== key) return { state: { status: 'loading' }, data: null, reload };
  if (stored.status === 'error') return { state: { status: 'error', message: stored.message }, data: stored.data, reload };
  return { state: { status: 'ready', data: stored.data }, data: stored.data, reload };
}
