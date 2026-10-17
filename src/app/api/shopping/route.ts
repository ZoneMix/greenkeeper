import { shoppingCreateSchema, shoppingListQuerySchema } from '@/lib/domain/schemas';
import { getDb } from '@/server/database';
import { handle, parseBody, parseQuery } from '@/server/http/handler';
import { ok, okList } from '@/server/http/responses';
import { listShopping } from '@/server/repositories/shopping';
import { addShoppingItem } from '@/server/services/shopping';

export const GET = handle((request: Request) => {
  const { purchased } = parseQuery(request, shoppingListQuerySchema);
  return okList(listShopping(getDb(), purchased === undefined ? {} : { purchased: purchased === 'true' }));
});

export const POST = handle(async (request: Request) => {
  const input = await parseBody(request, shoppingCreateSchema);
  return ok(addShoppingItem(getDb(), input), 201);
});
