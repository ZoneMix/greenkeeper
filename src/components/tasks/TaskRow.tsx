'use client';

import { useId, useRef, useState } from 'react';
import { useAction } from '@/hooks/useAction';
import { announce } from '@/lib/announce';
import { api } from '@/lib/api-client';
import { STATUS_LABELS, TASK_CATEGORY_LABELS, ZONE_LABELS } from '@/lib/domain/constants';
import { formatDate } from '@/lib/domain/dates';
import { taskDisplayStatus } from '@/lib/domain/season';
import type { ScheduleTask, TaskWeatherAdvice } from '@/lib/domain/types';
import { DeckChart } from '../settings/DeckChart';
import { Icon } from '../ui/Icon';
import { ErrorNotice } from '../ui/Notice';
import { AdviceTag, StatusTag } from '../ui/Tag';
import { AdviceNote } from './AdviceNote';

interface TaskRowProps {
  readonly task: ScheduleTask;
  readonly today: string;
  readonly advice?: TaskWeatherAdvice;
  readonly onChanged: () => void;
  readonly onEdit?: (task: ScheduleTask) => void;
  readonly defaultOpen?: boolean;
  /** Shows the deck height chart on mowing tasks. */
  readonly mowerModel?: string | null;
}

export function TaskRow({ task, today, advice, onChanged, onEdit, defaultOpen = false, mowerModel = null }: TaskRowProps) {
  const [open, setOpen] = useState(defaultOpen);
  const action = useAction();
  const detailId = useId();
  const status = taskDisplayStatus(task, today);
  const isPending = task.status === 'pending';

  const titleRef = useRef<HTMLButtonElement>(null);

  function setStatus(next: ScheduleTask['status']): void {
    // Buttons use aria-disabled so the focused one keeps focus while saving.
    if (action.pending) return;
    void action.run(
      () => api.tasks.update(task.id, { status: next }),
      () => {
        announce(`${task.title}: ${STATUS_LABELS[next].toLowerCase()}`);
        // The action buttons swap out; keep keyboard focus on this row.
        titleRef.current?.focus();
        onChanged();
      },
    );
  }

  return (
    <li>
      <div className={`row${isPending ? '' : ' is-done'}`}>
        <div className="row-main">
          <button
            ref={titleRef}
            type="button"
            className="link row-title"
            aria-expanded={open}
            aria-controls={detailId}
            onClick={() => setOpen((value) => !value)}
          >
            {task.title}
          </button>
          <div className="row-meta">
            <StatusTag status={status} />
            {advice ? <AdviceTag level={advice.level} /> : null}
            <span className="meta">
              <time dateTime={task.scheduled_date}>{formatDate(task.scheduled_date, { weekday: 'short', month: 'short', day: 'numeric' })}</time>
              {' · '}
              {TASK_CATEGORY_LABELS[task.category]}
              {' · '}
              {ZONE_LABELS[task.zone]}
            </span>
          </div>
        </div>
        <div className="row-actions">
          {isPending ? (
            <>
              <button type="button" className="btn btn-quiet btn-small" aria-disabled={action.pending || undefined} onClick={() => setStatus('completed')}>
                <Icon name="check" size="sm" />
                Done
              </button>
              <button type="button" className="btn btn-ghost btn-small" aria-disabled={action.pending || undefined} onClick={() => setStatus('skipped')}>
                Skip
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-ghost btn-small" aria-disabled={action.pending || undefined} onClick={() => setStatus('pending')}>
              Reopen
            </button>
          )}
        </div>
        <div id={detailId} className="row-detail" hidden={!open}>
          {task.description ? <p>{task.description}</p> : null}
          {task.notes ? (
            <p>
              <span className="meta">Notes: </span>
              {task.notes}
            </p>
          ) : null}
          {task.completed_date ? <p className="meta">Completed {formatDate(task.completed_date, { month: 'short', day: 'numeric', year: 'numeric' })}</p> : null}
          {advice ? <AdviceNote advice={advice} /> : null}
          {task.category === 'mowing' ? <DeckChart mowerModel={mowerModel} /> : null}
          {onEdit ? (
            <div className="cluster">
              <button type="button" className="btn btn-quiet btn-small" onClick={() => onEdit(task)}>
                <Icon name="edit" size="sm" />
                Edit task
              </button>
            </div>
          ) : null}
        </div>
        {action.error ? (
          <div className="row-detail">
            <ErrorNotice message={action.error} />
          </div>
        ) : null}
      </div>
    </li>
  );
}
