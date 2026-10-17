// Agronomy checks over a schedule. Pure functions: they flag problems, they never
// move tasks. Rules come from .claude/skills/lawn-season.

import { daysBetween } from './dates';
import { isInSeason, SEASON_RANGE_LONG } from './season';
import type { ScheduleTask, ScheduleWarning, Zone } from './types';

/** Corn gluten also stops grass seed, so it must not land within 6 weeks before seeding. */
export const PRE_EMERGENT_SEEDING_GAP_DAYS = 42;

const PRE_EMERGENT_PATTERN = /pre-?emergent|corn gluten|weed preventer/i;

type RuleTask = Pick<ScheduleTask, 'id' | 'title' | 'category' | 'scheduled_date' | 'status' | 'zone'>;

export function isPreEmergent(task: Pick<ScheduleTask, 'category' | 'title'>): boolean {
  return task.category === 'weed-control' && PRE_EMERGENT_PATTERN.test(task.title);
}

export function zonesOverlap(a: Zone, b: Zone): boolean {
  return a === 'both' || b === 'both' || a === b;
}

function preEmergentConflicts(tasks: ReadonlyArray<RuleTask>): ReadonlyArray<ScheduleWarning> {
  const preEmergents = tasks.filter(isPreEmergent);
  const seedings = tasks.filter((task) => task.category === 'overseeding');
  return preEmergents.flatMap((pre) =>
    seedings
      .filter((seed) => zonesOverlap(pre.zone, seed.zone))
      .filter((seed) => {
        const gap = daysBetween(pre.scheduled_date, seed.scheduled_date);
        return gap >= 0 && gap < PRE_EMERGENT_SEEDING_GAP_DAYS;
      })
      .map((seed) => ({
        kind: 'pre-emergent-before-overseeding' as const,
        task_ids: [pre.id, seed.id],
        message:
          `"${pre.title}" is ${daysBetween(pre.scheduled_date, seed.scheduled_date)} days before "${seed.title}". ` +
          'Corn gluten also stops grass seed: keep at least 6 weeks between them or skip one in that zone.',
      })),
  );
}

function outOfSeason(tasks: ReadonlyArray<RuleTask>): ReadonlyArray<ScheduleWarning> {
  return tasks
    .filter((task) => !isInSeason(task.scheduled_date))
    .map((task) => ({
      kind: 'out-of-season' as const,
      task_ids: [task.id],
      message: `"${task.title}" falls outside the ${SEASON_RANGE_LONG} growing season.`,
    }));
}

/** Checks pending tasks only; completed and skipped work is history. */
export function checkSchedule(tasks: ReadonlyArray<RuleTask>): ReadonlyArray<ScheduleWarning> {
  const pending = tasks.filter((task) => task.status === 'pending');
  return [...preEmergentConflicts(pending), ...outOfSeason(pending)];
}
