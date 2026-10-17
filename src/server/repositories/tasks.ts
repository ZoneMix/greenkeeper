import type { TaskCreateInput, TaskListQuery } from '@/lib/domain/schemas';
import type { ScheduleTask, ScheduleTaskWithProduct, TaskStatus } from '@/lib/domain/types';
import type { Db } from '../db/types';
import { findProduct } from './products';

const TASK_COLUMNS = `t.id, t.title, t.description, t.category, t.scheduled_date, t.completed_date,
  t.status, t.notes, t.product_id, t.zone, t.created_at, t.updated_at`;

/** Fields that may be written on update; status-derived completed_date is passed explicitly. */
export interface TaskPatch {
  readonly title?: string;
  readonly description?: string;
  readonly category?: ScheduleTask['category'];
  readonly scheduled_date?: string;
  readonly zone?: ScheduleTask['zone'];
  readonly status?: TaskStatus;
  readonly product_id?: number | null;
  readonly notes?: string | null;
  readonly completed_date?: string | null;
}

const PATCHABLE: ReadonlyArray<keyof TaskPatch> = [
  'title',
  'description',
  'category',
  'scheduled_date',
  'zone',
  'status',
  'product_id',
  'notes',
  'completed_date',
];

export function listTasks(db: Db, query: TaskListQuery = {}): ReadonlyArray<ScheduleTask> {
  const conditions: string[] = [];
  const params: Record<string, string | number> = {};
  if (query.status) {
    conditions.push('t.status = @status');
    params.status = query.status;
  }
  if (query.category) {
    conditions.push('t.category = @category');
    params.category = query.category;
  }
  if (query.month) {
    conditions.push("strftime('%Y-%m', t.scheduled_date) = @month");
    params.month = query.month;
  }
  if (query.from) {
    conditions.push('t.scheduled_date >= @from');
    params.from = query.from;
  }
  if (query.to) {
    conditions.push('t.scheduled_date <= @to');
    params.to = query.to;
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = query.limit ? 'LIMIT @limit' : '';
  if (query.limit) params.limit = query.limit;
  return db
    .prepare(`SELECT ${TASK_COLUMNS} FROM schedule_tasks t ${where} ORDER BY t.scheduled_date ASC, t.id ASC ${limit}`)
    .all(params) as ReadonlyArray<ScheduleTask>;
}

export function findTask(db: Db, id: number): ScheduleTask | null {
  const row = db.prepare(`SELECT ${TASK_COLUMNS} FROM schedule_tasks t WHERE t.id = ?`).get(id) as
    | ScheduleTask
    | undefined;
  return row ?? null;
}

export function findTaskWithProduct(db: Db, id: number): ScheduleTaskWithProduct | null {
  const task = findTask(db, id);
  if (!task) return null;
  return { ...task, product: task.product_id === null ? null : findProduct(db, task.product_id) };
}

export function insertTask(db: Db, input: TaskCreateInput): ScheduleTask {
  const result = db
    .prepare(
      `INSERT INTO schedule_tasks (title, description, category, scheduled_date, notes, product_id, zone)
       VALUES (@title, @description, @category, @scheduled_date, @notes, @product_id, @zone)`,
    )
    .run(input);
  const created = findTask(db, Number(result.lastInsertRowid));
  if (!created) throw new Error('Task insert did not persist');
  return created;
}

export function updateTask(db: Db, id: number, patch: TaskPatch): ScheduleTask | null {
  const keys = PATCHABLE.filter((key) => patch[key] !== undefined);
  if (keys.length > 0) {
    const assignments = keys.map((key) => `${key} = @${key}`).join(', ');
    const params = Object.fromEntries(keys.map((key) => [key, patch[key]]));
    db.prepare(`UPDATE schedule_tasks SET ${assignments}, updated_at = datetime('now') WHERE id = @id`).run({
      ...params,
      id,
    });
  }
  return findTask(db, id);
}

export function deleteTask(db: Db, id: number): boolean {
  return db.prepare('DELETE FROM schedule_tasks WHERE id = ?').run(id).changes > 0;
}

export function countTasks(db: Db, where: { readonly month?: string; readonly status?: TaskStatus } = {}): number {
  const conditions: string[] = [];
  const params: Record<string, string> = {};
  if (where.month) {
    conditions.push("strftime('%Y-%m', scheduled_date) = @month");
    params.month = where.month;
  }
  if (where.status) {
    conditions.push('status = @status');
    params.status = where.status;
  }
  const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const row = db.prepare(`SELECT COUNT(*) AS count FROM schedule_tasks ${clause}`).get(params) as { count: number };
  return row.count;
}

export function taskTitlesInYear(db: Db, year: number): ReadonlySet<string> {
  const rows = db
    .prepare("SELECT title FROM schedule_tasks WHERE strftime('%Y', scheduled_date) = ?")
    .all(String(year)) as ReadonlyArray<{ title: string }>;
  return new Set(rows.map((row) => row.title));
}
