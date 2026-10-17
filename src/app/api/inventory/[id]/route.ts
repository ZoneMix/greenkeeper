import { inventoryUpdateSchema } from '@/lib/domain/schemas';
import { getDb } from '@/server/database';
import { handle, parseBody, parseId, type IdRouteContext } from '@/server/http/handler';
import { ok } from '@/server/http/responses';
import { patchInventory, removeInventory } from '@/server/services/inventory';

export const PATCH = handle(async (request: Request, context: IdRouteContext) => {
  const id = await parseId(context);
  const input = await parseBody(request, inventoryUpdateSchema);
  return ok(patchInventory(getDb(), id, input));
});

export const DELETE = handle(async (_request: Request, context: IdRouteContext) =>
  ok(removeInventory(getDb(), await parseId(context))),
);
