import { isoFromParts } from '@/lib/domain/dates';
import type { ScheduleTask } from '@/lib/domain/types';
import { catalogNames } from '../catalog/products';
import { SEASON_TEMPLATE, type TemplateTask } from '../catalog/season-template';
import type { Db } from '../db/types';
import { findProductByName, isEligible } from '../repositories/products';
import { insertTask, taskTitlesInYear } from '../repositories/tasks';

export interface SeasonPlanResult {
  readonly year: number;
  readonly created: ReadonlyArray<ScheduleTask>;
  readonly skipped: number;
}

function templateDate(year: number, monthDay: string): string {
  const [month, day] = monthDay.split('-').map(Number);
  return isoFromParts(year, month ?? 1, day ?? 1);
}

/**
 * First preferred product that exists (under its catalog name or a configured alias)
 * and passes the organic + kid/pet-safe rule.
 */
function resolveProductId(db: Db, template: TemplateTask): number | null {
  for (const name of template.productKeys.flatMap((key) => catalogNames(key))) {
    const product = findProductByName(db, name);
    if (product && isEligible(product)) return product.id;
  }
  return null;
}

export interface PlanOptions {
  /** Skip template tasks dated before this day (a fresh install mid-season). */
  readonly notBefore?: string;
  readonly template?: ReadonlyArray<TemplateTask>;
}

/**
 * Adds the season template tasks for `year`. Idempotent: a template task whose title
 * already exists in that year is skipped, so re-planning never duplicates rows.
 */
export function planSeason(db: Db, year: number, options: PlanOptions = {}): SeasonPlanResult {
  const template = options.template ?? SEASON_TEMPLATE;
  const notBefore = options.notBefore ?? '';
  return db.transaction(() => {
    const existing = taskTitlesInYear(db, year);
    const created = template
      .filter((item) => !existing.has(item.title))
      .filter((item) => templateDate(year, item.monthDay) >= notBefore)
      .map((item) =>
        insertTask(db, {
          title: item.title,
          description: item.description,
          category: item.category,
          scheduled_date: templateDate(year, item.monthDay),
          zone: item.zone,
          product_id: resolveProductId(db, item),
          notes: null,
        }),
      );
    return { year, created, skipped: template.length - created.length };
  })();
}
