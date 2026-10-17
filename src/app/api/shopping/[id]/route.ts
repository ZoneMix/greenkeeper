import { todayIso } from '@/lib/domain/dates';
import { shoppingUpdateSchema } from '@/lib/domain/schemas';
import { getDb } from '@/server/database';
import { handle, parseBody, parseId, type IdRouteContext } from '@/server/http/handler';
import { ok } from '@/server/http/responses';
import { patchShoppingItem, removeShoppingItem } from '@/server/services/shopping';

export const PATCH = handle(async (request: Request, context: IdRouteContext) => {
  const id = await parseId(context);
  const input = await parseBody(request, shoppingUpdateSchema);
  return ok(patchShoppingItem(getDb(), id, input, todayIso()));
});

export const DELETE = handle(async (_request: Request, context: IdRouteContext) =>
  ok(removeShoppingItem(getDb(), await parseId(context))),
);
