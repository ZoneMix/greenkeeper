import type { TaskCreateInput, TaskUpdateInput } from '@/lib/domain/schemas';
import type { ScheduleTask, ScheduleTaskWithProduct } from '@/lib/domain/types';
import type { Db } from '../db/types';
import { notFound } from '../http/errors';
import { deleteTask, findTask, findTaskWithProduct, insertTask, updateTask, type TaskPatch } from '../repositories/tasks';
import { requireEligibleProduct } from './guards';

export function getTask(db: Db, id: number): ScheduleTaskWithProduct {
  const task = findTaskWithProduct(db, id);
  if (!task) throw notFound('Task');
  return task;
}

export function createTask(db: Db, input: TaskCreateInput): ScheduleTask {
  if (input.product_id !== null) requireEligibleProduct(db, input.product_id);
  return insertTask(db, input);
}

/** completed_date follows status: set on completion (kept if already done), cleared otherwise. */
export function completedDateFor(existing: ScheduleTask, status: ScheduleTask['status'] | undefined, today: string): string | null {
  if (status === undefined) return existing.completed_date;
  if (status === 'completed') return existing.status === 'completed' ? existing.completed_date ?? today : today;
  return null;
}

export function patchTask(db: Db, id: number, input: TaskUpdateInput, today: string): ScheduleTask {
  const existing = findTask(db, id);
  if (!existing) throw notFound('Task');
  if (input.product_id !== undefined && input.product_id !== null && input.product_id !== existing.product_id) {
    requireEligibleProduct(db, input.product_id);
  }
  const patch: TaskPatch = { ...input, completed_date: completedDateFor(existing, input.status, today) };
  const updated = updateTask(db, id, patch);
  if (!updated) throw notFound('Task');
  return updated;
}

export function removeTask(db: Db, id: number): { readonly deleted: true; readonly id: number } {
  if (!deleteTask(db, id)) throw notFound('Task');
  return { deleted: true, id };
}
