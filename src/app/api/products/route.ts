import { productCreateSchema, productListQuerySchema } from '@/lib/domain/schemas';
import { getDb } from '@/server/database';
import { handle, parseBody, parseQuery } from '@/server/http/handler';
import { ok, okList } from '@/server/http/responses';
import { insertProduct, listProducts } from '@/server/repositories/products';

export const GET = handle((request: Request) => okList(listProducts(getDb(), parseQuery(request, productListQuerySchema))));

export const POST = handle(async (request: Request) => {
  const input = await parseBody(request, productCreateSchema);
  return ok(insertProduct(getDb(), input), 201);
});
