import { inventoryCreateSchema } from '@/lib/domain/schemas';
import { getDb } from '@/server/database';
import { handle, parseBody } from '@/server/http/handler';
import { ok, okList } from '@/server/http/responses';
import { listInventory } from '@/server/repositories/inventory';
import { addInventory } from '@/server/services/inventory';

export const GET = handle(() => okList(listInventory(getDb())));

export const POST = handle(async (request: Request) => {
  const input = await parseBody(request, inventoryCreateSchema);
  return ok(addInventory(getDb(), input), 201);
});
