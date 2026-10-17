import { todayIso } from '@/lib/domain/dates';
import { shoppingGenerateSchema } from '@/lib/domain/schemas';
import { getDb } from '@/server/database';
import { handle, parseBody } from '@/server/http/handler';
import { ok } from '@/server/http/responses';
import { generateShoppingList } from '@/server/services/shopping-generator';

/**
 * Builds the shopping list from pending tasks in the next `horizon_days` (default 30),
 * mapping task categories to organic, kid/pet-safe products and subtracting stock.
 * Body is optional: { horizon_days?: number, dry_run?: boolean }.
 */
export const POST = handle(async (request: Request) => {
  const input = await parseBody(request, shoppingGenerateSchema);
  return ok(generateShoppingList(getDb(), input, todayIso()));
});
