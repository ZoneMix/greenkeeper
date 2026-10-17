import { monthKey } from '@/lib/domain/dates';
import { checkSchedule } from '@/lib/domain/schedule-rules';
import { planningYear, seasonStatus } from '@/lib/domain/season';
import type { DashboardSummary } from '@/lib/domain/types';
import type { Db } from '../db/types';
import { countInventory } from '../repositories/inventory';
import { listUnsafeProductsInUse } from '../repositories/products';
import { countOpenShopping } from '../repositories/shopping';
import { countTasks, listTasks, taskTitlesInYear } from '../repositories/tasks';

const UPCOMING_LIMIT = 5;
/** Offer to plan next season once the current one has under this many days left. */
const PLAN_AHEAD_DAYS = 45;

function unplannedYear(db: Db, today: string): number | null {
  const season = seasonStatus(today);
  const candidate =
    season.phase === 'after' || (season.phase === 'in-season' && season.days_remaining <= PLAN_AHEAD_DAYS)
      ? season.year + 1
      : planningYear(today);
  return taskTitlesInYear(db, candidate).size === 0 ? candidate : null;
}

export function getDashboard(db: Db, today: string): DashboardSummary {
  const month = monthKey(today);
  const pending = listTasks(db, { status: 'pending' });
  const upcoming = pending.filter((task) => task.scheduled_date >= today);

  return {
    today,
    season: seasonStatus(today),
    next_task: upcoming[0] ?? null,
    tasks_this_month: countTasks(db, { month }),
    completed_this_month: countTasks(db, { month, status: 'completed' }),
    overdue_tasks: pending.filter((task) => task.scheduled_date < today),
    upcoming_tasks: upcoming.slice(0, UPCOMING_LIMIT),
    inventory_count: countInventory(db),
    shopping_count: countOpenShopping(db),
    unsafe_products: listUnsafeProductsInUse(db).map(({ id, name, brand, organic, kid_safe }) => ({
      id,
      name,
      brand,
      organic,
      kid_safe,
    })),
    schedule_warnings: checkSchedule(pending),
    unplanned_year: unplannedYear(db, today),
  };
}
