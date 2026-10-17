import { formatDate, isoFromParts } from '@/lib/domain/dates';
import { isInSeason, taskDisplayStatus } from '@/lib/domain/season';
import type { ScheduleTask } from '@/lib/domain/types';
import { Icon } from '../ui/Icon';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

interface DaySummary {
  readonly date: string;
  readonly total: number;
  readonly overdue: number;
  readonly done: number;
}

function summarise(date: string, tasks: ReadonlyArray<ScheduleTask>, today: string): DaySummary {
  const onDay = tasks.filter((t) => t.scheduled_date === date);
  return {
    date,
    total: onDay.length,
    overdue: onDay.filter((t) => taskDisplayStatus(t, today) === 'overdue').length,
    done: onDay.filter((t) => t.status === 'completed').length,
  };
}

function dayLabel(day: DaySummary, today: string): string {
  const parts = [
    formatDate(day.date, { weekday: 'long', month: 'long', day: 'numeric' }),
    day.date === today ? 'today' : null,
    day.total === 0 ? 'no tasks' : `${day.total} ${day.total === 1 ? 'task' : 'tasks'}`,
    day.overdue > 0 ? `${day.overdue} overdue` : null,
    day.done > 0 ? `${day.done} done` : null,
    isInSeason(day.date) ? null : 'outside growing season',
  ];
  return parts.filter(Boolean).join(', ');
}

interface MonthGridProps {
  readonly year: number;
  readonly month: number;
  readonly tasks: ReadonlyArray<ScheduleTask>;
  readonly today: string;
  readonly selected: string | null;
  readonly onSelect: (date: string | null) => void;
}

/** Month view. Each day says what it holds in words (aria-label) and glyphs, never by colour alone. */
export function MonthGrid({ year, month, tasks, today, selected, onSelect }: MonthGridProps) {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => summarise(isoFromParts(year, month, i + 1), tasks, today));

  return (
    <div className="month-grid" role="group" aria-label={formatDate(isoFromParts(year, month, 1), { month: 'long', year: 'numeric' })}>
      {WEEKDAYS.map((name) => (
        <div key={name} className="dow" aria-hidden="true">
          {name}
        </div>
      ))}
      {Array.from({ length: firstWeekday }, (_, i) => (
        <div key={`blank-${i}`} className="day-blank" aria-hidden="true" />
      ))}
      {days.map((day) => {
        const classes = [
          'day',
          day.date === today ? 'is-today' : '',
          isInSeason(day.date) ? '' : 'is-outside',
          day.overdue > 0 ? 'has-overdue' : '',
        ].filter(Boolean);
        const pending = day.total - day.done - day.overdue;
        return (
          <button
            key={day.date}
            type="button"
            className={classes.join(' ')}
            aria-pressed={selected === day.date}
            aria-label={dayLabel(day, today)}
            onClick={() => onSelect(selected === day.date ? null : day.date)}
          >
            <span className="day-num">{Number(day.date.slice(8))}</span>
            {day.total > 0 ? (
              <span className="day-marks" aria-hidden="true">
                {day.overdue > 0 ? (
                  <span className="is-attention">
                    <Icon name="alert" size="sm" />
                    {day.overdue}
                    <span className="label"> late</span>
                  </span>
                ) : null}
                {pending > 0 ? (
                  <span>
                    <Icon name="clock" size="sm" />
                    {pending}
                  </span>
                ) : null}
                {day.done > 0 ? (
                  <span className="is-good">
                    <Icon name="check" size="sm" />
                    {day.done}
                  </span>
                ) : null}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function CalendarLegend() {
  return (
    <p className="legend meta">
      <span>
        <Icon name="clock" size="sm" /> Upcoming
      </span>
      <span>
        <Icon name="check" size="sm" /> Done
      </span>
      <span>
        <Icon name="alert" size="sm" /> Overdue (dashed border)
      </span>
      <span>Faded days are outside the growing season</span>
    </p>
  );
}
