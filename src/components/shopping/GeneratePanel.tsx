'use client';

import { useState } from 'react';
import { useAction } from '@/hooks/useAction';
import { announce } from '@/lib/announce';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/domain/dates';
import type { ShoppingGenerateResult } from '@/lib/domain/types';
import { Icon } from '../ui/Icon';
import { ErrorNotice, Notice } from '../ui/Notice';

const HORIZONS = [14, 30, 60, 120] as const;

export function GeneratePanel({ onGenerated }: { readonly onGenerated: () => void }) {
  const [horizon, setHorizon] = useState<number>(30);
  const [result, setResult] = useState<ShoppingGenerateResult | null>(null);
  const action = useAction();

  const run = (dryRun: boolean) => {
    // aria-disabled keeps focus on the pressed button while the request runs.
    if (action.pending) return;
    void action.run(async () => {
      const outcome = await api.shopping.generate({ horizon_days: horizon, dry_run: dryRun });
      setResult(outcome);
      announce(outcome.message);
      if (!dryRun) onGenerated();
    });
  };

  const toBuy = result?.items.filter((item) => item.quantity_needed > 0) ?? [];

  return (
    <div className="stack">
      <div className="cluster">
        <div className="field">
          <span className="label" id="horizon-label">
            Look ahead
          </span>
          <div className="segmented" role="group" aria-labelledby="horizon-label">
            {HORIZONS.map((days) => (
              <button key={days} type="button" aria-pressed={horizon === days} onClick={() => setHorizon(days)}>
                {days} days
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="cluster">
        <button type="button" className="btn btn-primary" aria-disabled={action.pending || undefined} onClick={() => run(false)}>
          <Icon name="sparkle" size="sm" />
          {action.pending ? 'Working…' : 'Update list from schedule'}
        </button>
        <button type="button" className="btn btn-quiet" aria-disabled={action.pending || undefined} onClick={() => run(true)}>
          Preview only
        </button>
      </div>
      {action.error ? <ErrorNotice message={action.error} /> : null}
      {result ? (
        <div className="stack">
          <Notice tone={result.warnings.length > 0 ? 'attention' : 'good'} icon={result.warnings.length > 0 ? 'alert' : 'check'}>
            <p>
              {result.message} ({formatDate(result.from)} to {formatDate(result.to)}).
            </p>
            {result.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </Notice>
          {result.dry_run && toBuy.length > 0 ? (
            <ul className="rows">
              {toBuy.map((item) => (
                <li key={item.key}>
                  <div className="row">
                    <div className="row-main">
                      <span className="row-title">{item.name}</span>
                      <span className="meta">{item.reason}</span>
                    </div>
                    <span className="num">
                      {item.quantity_needed} {item.unit}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
