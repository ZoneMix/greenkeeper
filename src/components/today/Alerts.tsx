'use client';

import Link from 'next/link';
import { useAction } from '@/hooks/useAction';
import { api } from '@/lib/api-client';
import { productLabel } from '@/lib/domain/format';
import type { DashboardSummary } from '@/lib/domain/types';
import { ErrorNotice, Notice } from '../ui/Notice';

interface AlertsProps {
  readonly summary: DashboardSummary;
  readonly onChanged: () => void;
}

/** Things that need a decision: unsafe legacy products, agronomy conflicts, next season. */
export function Alerts({ summary, onChanged }: AlertsProps) {
  const plan = useAction();
  const { unsafe_products: unsafe, schedule_warnings: warnings, unplanned_year: year } = summary;
  if (unsafe.length === 0 && warnings.length === 0 && year === null) return null;

  return (
    <div className="stack" role="region" aria-label="Needs attention">
      {unsafe.length > 0 ? (
        <Notice tone="attention" icon="shield">
          <p>
            <strong>Not organic or not kid/pet-safe:</strong> {unsafe.map(productLabel).join(', ')}. These came
            from older data. The shopping generator will not buy them; swap them on the affected tasks.
          </p>
        </Notice>
      ) : null}
      {warnings.map((warning) => (
        <Notice key={`${warning.kind}-${warning.task_ids.join('-')}`} tone="attention">
          <p>{warning.message}</p>
        </Notice>
      ))}
      {year !== null ? (
        <Notice icon="calendar">
          <p>The {year} season has no tasks yet. Add the season plan; you can edit or skip any task.</p>
          <div className="cluster">
            <button
              type="button"
              className="btn btn-quiet btn-small"
              aria-disabled={plan.pending || undefined}
              onClick={() => {
                if (!plan.pending) void plan.run(() => api.tasks.planSeason(year), onChanged);
              }}
            >
              {plan.pending ? 'Planning…' : `Plan ${year} season`}
            </button>
            <Link className="link" href="/calendar">
              Open calendar
            </Link>
          </div>
          {plan.error ? <ErrorNotice message={plan.error} /> : null}
        </Notice>
      ) : null}
    </div>
  );
}
