'use client';

import { useState, type FormEvent } from 'react';
import { useAction } from '@/hooks/useAction';
import { useResource } from '@/hooks/useResource';
import { api } from '@/lib/api-client';
import { TASK_CATEGORIES, TASK_CATEGORY_LABELS, ZONES, ZONE_LABELS } from '@/lib/domain/constants';
import { productLabel } from '@/lib/domain/format';
import { taskCreateSchema } from '@/lib/domain/schemas';
import type { ScheduleTask, TaskCategory, Zone } from '@/lib/domain/types';
import { Field } from '../ui/Field';
import { Icon } from '../ui/Icon';
import { ErrorNotice } from '../ui/Notice';

interface TaskFormProps {
  /** Edit this task; omit to create a new one. */
  readonly task?: ScheduleTask;
  readonly defaultDate: string;
  readonly onSaved: () => void;
  readonly onCancel: () => void;
}

interface Draft {
  readonly title: string;
  readonly scheduled_date: string;
  readonly category: TaskCategory;
  readonly zone: Zone;
  readonly product_id: string;
  readonly description: string;
  readonly notes: string;
}

type Errors = Partial<Record<keyof Draft, string>>;

function initialDraft(task: ScheduleTask | undefined, defaultDate: string): Draft {
  return {
    title: task?.title ?? '',
    scheduled_date: task?.scheduled_date ?? defaultDate,
    category: task?.category ?? 'fertilizer',
    zone: task?.zone ?? 'both',
    product_id: task?.product_id ? String(task.product_id) : '',
    description: task?.description ?? '',
    notes: task?.notes ?? '',
  };
}

export function TaskForm({ task, defaultDate, onSaved, onCancel }: TaskFormProps) {
  const [draft, setDraft] = useState<Draft>(() => initialDraft(task, defaultDate));
  const [errors, setErrors] = useState<Errors>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const action = useAction();
  // Only safe products can be linked; the API enforces this too.
  const products = useResource('products', () => api.products.list());
  const eligible = (products.data ?? []).filter((p) => p.organic && p.kid_safe && p.category !== 'tool');

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((prev) => ({ ...prev, [key]: value }));

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (action.pending) return;
    const payload = {
      title: draft.title,
      scheduled_date: draft.scheduled_date,
      category: draft.category,
      zone: draft.zone,
      product_id: draft.product_id ? Number(draft.product_id) : null,
      description: draft.description,
      notes: draft.notes.trim() ? draft.notes : null,
    };
    const parsed = taskCreateSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])));
      return;
    }
    setErrors({});
    await action.run(() => (task ? api.tasks.update(task.id, parsed.data) : api.tasks.create(parsed.data)), onSaved);
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <Field label="Title" error={errors.title}>
        {(props) => <input {...props} value={draft.title} onChange={(e) => set('title', e.target.value)} required autoFocus />}
      </Field>
      <div className="form-row">
        <Field label="Date" error={errors.scheduled_date}>
          {(props) => <input {...props} type="date" value={draft.scheduled_date} onChange={(e) => set('scheduled_date', e.target.value)} required />}
        </Field>
        <Field label="Category">
          {(props) => (
            <select {...props} value={draft.category} onChange={(e) => set('category', e.target.value as TaskCategory)}>
              {TASK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {TASK_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Area">
          {(props) => (
            <select {...props} value={draft.zone} onChange={(e) => set('zone', e.target.value as Zone)}>
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {ZONE_LABELS[z]}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <Field label="Product (optional)" hint="Only organic, kid- and pet-safe products are listed.">
        {(props) => (
          <select {...props} value={draft.product_id} onChange={(e) => set('product_id', e.target.value)}>
            <option value="">None</option>
            {eligible.map((p) => (
              <option key={p.id} value={p.id}>
                {productLabel(p)}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Description" error={errors.description}>
        {(props) => <textarea {...props} value={draft.description} onChange={(e) => set('description', e.target.value)} />}
      </Field>
      <Field label="Notes" error={errors.notes}>
        {(props) => <input {...props} value={draft.notes} onChange={(e) => set('notes', e.target.value)} />}
      </Field>
      {action.error ? <ErrorNotice message={action.error} /> : null}
      <div className="sheet-foot">
        {task ? (
          confirmingDelete ? (
            <button
              type="button"
              className="btn btn-quiet"
              aria-disabled={action.pending || undefined}
              onClick={() => {
                if (!action.pending) void action.run(() => api.tasks.remove(task.id), onSaved);
              }}
            >
              <Icon name="trash" size="sm" />
              Confirm delete
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmingDelete(true)}>
              Delete…
            </button>
          )
        ) : null}
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" aria-disabled={action.pending || undefined}>
          {action.pending ? 'Saving…' : task ? 'Save task' : 'Add task'}
        </button>
      </div>
    </form>
  );
}
