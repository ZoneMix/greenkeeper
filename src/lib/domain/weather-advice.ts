// Turns a 7-day forecast into short timing notes for upcoming tasks. Advisory only:
// nothing here reschedules a task. Thresholds follow common extension guidance for
// cool-season lawns and are deliberately conservative.

import { addDays, weekdayShort } from './dates';
import { isPreEmergent } from './schedule-rules';
import type { AdviceLevel, ScheduleTask, TaskWeatherAdvice, WeatherDay } from './types';

export const THRESHOLDS = {
  /** Corn gluten works once soil holds about 55°F (crabgrass germination). */
  preEmergentSoilF: 55,
  preEmergentEarlySoilF: 50,
  /** Cool-season seed germinates best with soil between 50 and 65°F. */
  seedSoilMinF: 50,
  seedSoilMaxF: 65,
  seedSoilSlowF: 45,
  frostF: 32,
  heavyRainIn: 1,
  washRainIn: 0.5,
  lightRainMinIn: 0.1,
  wetDayChance: 60,
  weeklyWaterIn: 1,
  partialWaterIn: 0.5,
  /** Look this many days past the task date for rain that helps or hurts. */
  windowDays: 2,
  /** Overdue tasks this recent are evaluated against today's forecast. */
  overdueDays: 14,
} as const;

interface Finding {
  readonly level: AdviceLevel;
  readonly text: string;
}

type AdviceTask = Pick<ScheduleTask, 'id' | 'title' | 'category' | 'scheduled_date' | 'status'>;

const LEVEL_RANK: Readonly<Record<AdviceLevel, number>> = { good: 0, caution: 1, hold: 2 };

const inches = (value: number): string => `${value.toFixed(2)} in`;
const degrees = (value: number): string => `${Math.round(value)}°F`;

function windowDays(days: ReadonlyArray<WeatherDay>, start: string, span: number): ReadonlyArray<WeatherDay> {
  const end = addDays(start, span);
  return days.filter((day) => day.date >= start && day.date <= end);
}

function frost(day: WeatherDay): Finding | null {
  return day.low_f <= THRESHOLDS.frostF
    ? { level: 'caution', text: `Frost likely ${weekdayShort(day.date)} (low ${degrees(day.low_f)}).` }
    : null;
}

function preEmergentFindings(day: WeatherDay): ReadonlyArray<Finding | null> {
  const soil = day.soil_temp_f;
  const soilFinding: Finding | null =
    soil === null
      ? null
      : soil < THRESHOLDS.preEmergentEarlySoilF
        ? { level: 'hold', text: `Soil is about ${degrees(soil)}; corn gluten works once soil holds ${THRESHOLDS.preEmergentSoilF}°F.` }
        : soil < THRESHOLDS.preEmergentSoilF
          ? { level: 'caution', text: `Soil is about ${degrees(soil)}, close to the ${THRESHOLDS.preEmergentSoilF}°F target.` }
          : { level: 'good', text: `Soil is about ${degrees(soil)}, warm enough for corn gluten.` };
  const wash: Finding | null =
    day.precip_in >= THRESHOLDS.washRainIn
      ? { level: 'caution', text: `${inches(day.precip_in)} of rain that day can wash granules around.` }
      : null;
  return [soilFinding, wash];
}

function fertilizerFindings(window: ReadonlyArray<WeatherDay>): ReadonlyArray<Finding | null> {
  const [day, ...after] = window;
  if (!day) return [];
  if (day.precip_in >= THRESHOLDS.heavyRainIn) {
    return [{ level: 'hold', text: `Heavy rain (${inches(day.precip_in)}) could wash granules off; a drier day is better.` }];
  }
  const soaker = [day, ...after].find(
    (d) => d.precip_in >= THRESHOLDS.lightRainMinIn && d.precip_in < THRESHOLDS.heavyRainIn,
  );
  return [
    soaker
      ? { level: 'good', text: `Light rain ${weekdayShort(soaker.date)} (${inches(soaker.precip_in)}) will water it in.` }
      : { level: 'good', text: 'Dry window: water in lightly after spreading.' },
  ];
}

function seedingFindings(window: ReadonlyArray<WeatherDay>): ReadonlyArray<Finding | null> {
  const day = window[0];
  if (!day) return [];
  const soil = day.soil_temp_f;
  const total = window.reduce((sum, d) => sum + d.precip_in, 0);
  const soilFinding: Finding | null =
    soil === null
      ? null
      : soil < THRESHOLDS.seedSoilSlowF
        ? { level: 'caution', text: `Soil is about ${degrees(soil)}; seed will be slow to germinate.` }
        : soil > THRESHOLDS.seedSoilMaxF + 10
          ? { level: 'caution', text: `Soil is about ${degrees(soil)}; heat stresses new seedlings.` }
          : soil >= THRESHOLDS.seedSoilMinF && soil <= THRESHOLDS.seedSoilMaxF
            ? { level: 'good', text: `Soil is about ${degrees(soil)}, ideal for germination.` }
            : null;
  const washout: Finding | null =
    total >= THRESHOLDS.heavyRainIn
      ? { level: 'caution', text: `${inches(total)} of rain in the next few days may wash seed.` }
      : null;
  return [soilFinding, washout, frost(day)];
}

function mowingFindings(day: WeatherDay): ReadonlyArray<Finding | null> {
  const wet = day.precip_in >= THRESHOLDS.lightRainMinIn || (day.precip_chance ?? 0) >= THRESHOLDS.wetDayChance;
  return [
    wet
      ? { level: 'caution', text: `Rain likely ${weekdayShort(day.date)}; mow once the grass is dry.` }
      : { level: 'good', text: `Dry ${weekdayShort(day.date)}: good for mowing.` },
  ];
}

function wateringFindings(days: ReadonlyArray<WeatherDay>): ReadonlyArray<Finding | null> {
  const week = days.reduce((sum, d) => sum + d.precip_in, 0);
  if (week >= THRESHOLDS.weeklyWaterIn) {
    return [{ level: 'hold', text: `${inches(week)} of rain forecast this week covers the 1 in target; skip watering.` }];
  }
  if (week >= THRESHOLDS.partialWaterIn) {
    return [{ level: 'caution', text: `${inches(week)} of rain forecast; top up to about 1 in for the week.` }];
  }
  return [{ level: 'good', text: `Only ${inches(week)} of rain forecast; plan a deep watering.` }];
}

function aerationFindings(day: WeatherDay): ReadonlyArray<Finding | null> {
  return day.precip_in >= THRESHOLDS.washRainIn
    ? [{ level: 'caution', text: `${inches(day.precip_in)} of rain: aerate moist soil, not soggy soil.` }]
    : [];
}

function findingsFor(task: AdviceTask, target: string, days: ReadonlyArray<WeatherDay>): ReadonlyArray<Finding> {
  const window = windowDays(days, target, THRESHOLDS.windowDays);
  const day = window[0];
  if (!day) return [];
  const raw: ReadonlyArray<Finding | null> = (() => {
    switch (task.category) {
      case 'weed-control':
        return isPreEmergent(task) ? preEmergentFindings(day) : [];
      case 'fertilizer':
        return [...fertilizerFindings(window), frost(day)];
      case 'overseeding':
        return seedingFindings(window);
      case 'mowing':
        return mowingFindings(day);
      case 'watering':
        return wateringFindings(days);
      case 'aeration':
        return aerationFindings(day);
      default:
        return [];
    }
  })();
  return raw.filter((finding): finding is Finding => finding !== null);
}

const HEADLINES: Readonly<Record<AdviceLevel, string>> = {
  good: 'Good window',
  caution: 'Check conditions',
  hold: 'Consider another day',
};

/**
 * Advice for pending tasks dated inside the forecast, plus recently overdue tasks
 * (judged against today). Tasks with nothing useful to say are left out.
 */
export function adviseTasks(
  tasks: ReadonlyArray<AdviceTask>,
  days: ReadonlyArray<WeatherDay>,
  today: string,
): ReadonlyArray<TaskWeatherAdvice> {
  const forecast = days.filter((day) => day.date >= today);
  const lastDay = forecast[forecast.length - 1]?.date;
  if (!lastDay) return [];

  return tasks
    .filter((task) => task.status === 'pending')
    .filter((task) => task.scheduled_date <= lastDay && task.scheduled_date >= addDays(today, -THRESHOLDS.overdueDays))
    .flatMap((task) => {
      const target = task.scheduled_date < today ? today : task.scheduled_date;
      const findings = findingsFor(task, target, forecast);
      if (findings.length === 0) return [];
      const level = findings.reduce<AdviceLevel>((worst, f) => (LEVEL_RANK[f.level] > LEVEL_RANK[worst] ? f.level : worst), 'good');
      return [
        {
          task_id: task.id,
          task_title: task.title,
          scheduled_date: task.scheduled_date,
          level,
          headline: HEADLINES[level],
          reasons: findings.map((f) => f.text),
        },
      ];
    });
}
