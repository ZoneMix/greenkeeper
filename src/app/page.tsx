'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alerts } from '@/components/today/Alerts';
import { SeasonOverview } from '@/components/today/SeasonOverview';
import { WeatherPanel } from '@/components/today/WeatherPanel';
import { TaskForm } from '@/components/tasks/TaskForm';
import { TaskRow } from '@/components/tasks/TaskRow';
import { Dialog } from '@/components/ui/Dialog';
import { Icon } from '@/components/ui/Icon';
import { EmptyState, Loading, PageHead, Section } from '@/components/ui/Layout';
import { ErrorNotice, Notice } from '@/components/ui/Notice';
import { useResource } from '@/hooks/useResource';
import { api } from '@/lib/api-client';
import { LOCATION_LABEL, USDA_ZONE } from '@/lib/domain/constants';
import { formatDate } from '@/lib/domain/dates';
import { SEASON_RANGE_LONG } from '@/lib/domain/season';
import type { ScheduleTask, TaskWeatherAdvice } from '@/lib/domain/types';

const MAX_OVERDUE_SHOWN = 5;

function adviceFor(advice: ReadonlyArray<TaskWeatherAdvice>, id: number): TaskWeatherAdvice | undefined {
  return advice.find((a) => a.task_id === id);
}

export default function TodayPage() {
  const dashboard = useResource('dashboard', () => api.dashboard());
  const weather = useResource('weather', () => api.weather());
  const settings = useResource('settings', () => api.settings.get());
  const [editing, setEditing] = useState<ScheduleTask | 'new' | null>(null);
  const summary = dashboard.data;
  const advice = weather.data?.advice ?? [];
  const reload = () => {
    dashboard.reload();
    weather.reload();
  };

  const header = (
    <PageHead
      eyebrow="Your lawn today"
      title="Today"
      lede={summary ? `${formatDate(summary.today, { weekday: 'long', month: 'long', day: 'numeric' })} in ${LOCATION_LABEL}.` : 'Your lawn at a glance.'}
      actions={
        <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
          <Icon name="plus" size="sm" />
          Add task
        </button>
      }
    />
  );

  if (!summary) {
    return (
      <>
        {header}
        <div className="sect">
          <div />
          {dashboard.state.status === 'error' ? (
            <ErrorNotice message={dashboard.state.message} onRetry={dashboard.reload} />
          ) : (
            <Loading label="Loading your lawn" />
          )}
        </div>
      </>
    );
  }

  const overdueShown = summary.overdue_tasks.slice(0, MAX_OVERDUE_SHOWN);
  const overdueHidden = summary.overdue_tasks.length - overdueShown.length;
  const nextTasks = [...overdueShown, ...summary.upcoming_tasks];

  return (
    <>
      {header}
      <Section id="attention" title="Next up" note="Overdue work first, then the next few tasks.">
        <Alerts summary={summary} onChanged={reload} />
        {overdueHidden > 0 ? (
          <Notice tone="attention">
            <p>
              {overdueHidden} more overdue {overdueHidden === 1 ? 'task' : 'tasks'}.{' '}
              <Link className="link" href="/calendar">
                Review them in the calendar
              </Link>
            </p>
          </Notice>
        ) : null}
        {nextTasks.length === 0 ? (
          <EmptyState action={<Link className="link" href="/calendar">Open the calendar</Link>}>Nothing pending. Enjoy the lawn.</EmptyState>
        ) : (
          <ul className="rows">
            {nextTasks.map((task, index) => (
              <TaskRow
                key={task.id}
                task={task}
                today={summary.today}
                advice={adviceFor(advice, task.id)}
                onChanged={reload}
                mowerModel={settings.data?.mower_model ?? null}
                onEdit={setEditing}
                defaultOpen={index === 0}
              />
            ))}
          </ul>
        )}
      </Section>

      <Section id="weather" title="Weather" note="Forecast for your coordinates. Task notes are suggestions; dates never move on their own.">
        {weather.data ? (
          <WeatherPanel report={weather.data.report} today={summary.today} />
        ) : weather.state.status === 'error' ? (
          <Notice icon="cloud">
            <p>{weather.state.message}</p>
          </Notice>
        ) : (
          <Loading label="Loading weather" />
        )}
      </Section>

      <Section id="season" title="Season" note={`${SEASON_RANGE_LONG} in Zone ${USDA_ZONE}.`}>
        <SeasonOverview summary={summary} />
      </Section>

      <Dialog open={editing !== null} title={editing === 'new' ? 'New task' : 'Edit task'} onClose={() => setEditing(null)}>
        <TaskForm
          task={editing === 'new' || editing === null ? undefined : editing}
          defaultDate={summary.today}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      </Dialog>
    </>
  );
}
