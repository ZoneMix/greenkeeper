'use client';

import { useState } from 'react';
import { CalendarLegend, MonthGrid } from '@/components/calendar/MonthGrid';
import { TaskForm } from '@/components/tasks/TaskForm';
import { TaskRow } from '@/components/tasks/TaskRow';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { EmptyState, Loading, PageHead, Section } from '@/components/ui/Layout';
import { ErrorNotice } from '@/components/ui/Notice';
import { useResource } from '@/hooks/useResource';
import { api } from '@/lib/api-client';
import { TASK_CATEGORIES, TASK_CATEGORY_LABELS } from '@/lib/domain/constants';
import { formatDate, isoFromParts } from '@/lib/domain/dates';
import { useToday } from '@/hooks/useToday';
import type { ScheduleTask, TaskCategory } from '@/lib/domain/types';

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

function CalendarView({ today }: { readonly today: string }) {
  const [cursor, setCursor] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) }));
  const [selected, setSelected] = useState<string | null>(null);
  const [category, setCategory] = useState<TaskCategory | null>(null);
  const [editing, setEditing] = useState<ScheduleTask | 'new' | null>(null);
  const monthKey = isoFromParts(cursor.year, cursor.month, 1).slice(0, 7);
  const tasks = useResource(`tasks-${monthKey}`, () => api.tasks.list({ month: monthKey }));
  const weather = useResource('weather', () => api.weather());
  const settings = useResource('settings', () => api.settings.get());

  const all = tasks.data ?? [];
  const filtered = category ? all.filter((t) => t.category === category) : all;
  const visible = selected ? filtered.filter((t) => t.scheduled_date === selected) : filtered;
  const monthLabel = formatDate(isoFromParts(cursor.year, cursor.month, 1), { month: 'long', year: 'numeric' });

  const move = (delta: number) => {
    setCursor((current) => shiftMonth(current.year, current.month, delta));
    setSelected(null);
  };

  return (
    <>
      <PageHead
        eyebrow="Season planner"
        title="Calendar"
        lede="Plan and check off the season, month by month."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
            <Icon name="plus" size="sm" />
            Add task
          </button>
        }
      />

      <Section id="month" title={monthLabel} note="Pick a day to see its tasks; pick it again to see the whole month.">
        <div className="month-nav">
          <button type="button" className="btn btn-quiet btn-small" onClick={() => move(-1)}>
            <Icon name="chevronLeft" size="sm" />
            <span>Previous</span>
          </button>
          <button
            type="button"
            className="link"
            onClick={() => {
              setCursor({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) });
              setSelected(today);
            }}
          >
            Today
          </button>
          <button type="button" className="btn btn-quiet btn-small" onClick={() => move(1)}>
            <span>Next</span>
            <Icon name="chevronRight" size="sm" />
          </button>
        </div>
        <MonthGrid year={cursor.year} month={cursor.month} tasks={filtered} today={today} selected={selected} onSelect={setSelected} />
        <CalendarLegend />
      </Section>

      <Section
        id="tasks"
        title={selected ? formatDate(selected, { weekday: 'short', month: 'short', day: 'numeric' }) : 'This month'}
        aside={
          selected ? (
            <button type="button" className="link" onClick={() => setSelected(null)}>
              Show whole month
            </button>
          ) : null
        }
      >
        <div className="filters" role="group" aria-label="Filter by category">
          <button type="button" className="chip" aria-pressed={category === null} onClick={() => setCategory(null)}>
            All
          </button>
          {TASK_CATEGORIES.map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={category === c} onClick={() => setCategory(category === c ? null : c)}>
              {TASK_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        {tasks.state.status === 'error' ? (
          <ErrorNotice message={tasks.state.message} onRetry={tasks.reload} />
        ) : !tasks.data ? (
          <Loading label="Loading tasks" />
        ) : visible.length === 0 ? (
          <EmptyState>{selected ? 'No tasks on this day.' : 'No tasks this month.'}</EmptyState>
        ) : (
          <ul className="rows">
            {visible.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                today={today}
                advice={weather.data?.advice.find((a) => a.task_id === task.id)}
                onChanged={tasks.reload}
                mowerModel={settings.data?.mower_model ?? null}
                onEdit={setEditing}
              />
            ))}
          </ul>
        )}
      </Section>

      <Dialog open={editing !== null} title={editing === 'new' ? 'New task' : 'Edit task'} onClose={() => setEditing(null)}>
        <TaskForm
          task={editing === 'new' || editing === null ? undefined : editing}
          defaultDate={selected ?? today}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            tasks.reload();
          }}
        />
      </Dialog>
    </>
  );
}

export default function CalendarPage() {
  const today = useToday();
  return today ? (
    <CalendarView today={today} />
  ) : (
    <>
      <PageHead eyebrow="Season planner" title="Calendar" lede="Plan and check off the season, month by month." />
      <div className="sect">
        <div />
        <Loading label="Loading calendar" />
      </div>
    </>
  );
}
