import { formatDate } from '@/lib/domain/dates';
import type { DashboardSummary } from '@/lib/domain/types';
import { Icon } from '../ui/Icon';
import { Meter } from '../ui/Layout';

const PHASE_TEXT = {
  before: 'Season starts soon',
  'in-season': 'Growing season',
  after: 'Season over',
} as const;

export function SeasonOverview({ summary }: { readonly summary: DashboardSummary }) {
  const { season } = summary;
  const overdue = summary.overdue_tasks.length;
  return (
    <div className="stack">
      <Meter
        label={`${PHASE_TEXT[season.phase]} ${season.year}`}
        value={season.progress}
        max={100}
        valueText={season.phase === 'in-season' ? `${season.progress}% · ${season.days_remaining} days left` : `${season.progress}%`}
        start={formatDate(season.start)}
        end={formatDate(season.end)}
      />
      <dl className="stats">
        <div>
          <dt>Tasks this month</dt>
          <dd>{summary.tasks_this_month}</dd>
        </div>
        <div>
          <dt>Done this month</dt>
          <dd>
            {summary.completed_this_month}
            <Icon name="check" size="sm" />
          </dd>
        </div>
        <div className={overdue > 0 ? 'is-attention' : undefined}>
          <dt>Overdue</dt>
          <dd>
            {overdue}
            {overdue > 0 ? <Icon name="alert" size="sm" label="needs attention" /> : null}
          </dd>
        </div>
        <div>
          <dt>To buy</dt>
          <dd>{summary.shopping_count}</dd>
        </div>
      </dl>
    </div>
  );
}
