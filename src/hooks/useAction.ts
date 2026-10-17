'use client';

import { useCallback, useState } from 'react';
import { errorMessage } from '@/lib/api-client';

export interface Action {
  readonly pending: boolean;
  readonly error: string | null;
  readonly run: (work: () => Promise<unknown>, onDone?: () => void) => Promise<boolean>;
  readonly clearError: () => void;
}

/** Runs one mutation at a time and keeps its error message for display. */
export function useAction(): Action {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (work: () => Promise<unknown>, onDone?: () => void): Promise<boolean> => {
    setPending(true);
    setError(null);
    try {
      await work();
      onDone?.();
      return true;
    } catch (caught: unknown) {
      setError(errorMessage(caught));
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);
  return { pending, error, run, clearError };
}
