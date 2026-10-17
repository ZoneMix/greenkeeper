import { seasonPlanSchema } from '@/lib/domain/schemas';
import { getDb } from '@/server/database';
import { handle, parseBody } from '@/server/http/handler';
import { ok } from '@/server/http/responses';
import { planSeason } from '@/server/services/season-planner';

/** Adds the Zone 4b template for a year. Safe to repeat: existing tasks are skipped. */
export const POST = handle(async (request: Request) => {
  const { year } = await parseBody(request, seasonPlanSchema);
  const result = planSeason(getDb(), year);
  return ok(result, result.created.length > 0 ? 201 : 200);
});
