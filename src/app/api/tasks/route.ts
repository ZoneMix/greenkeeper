import { taskCreateSchema, taskListQuerySchema } from '@/lib/domain/schemas';
import { getDb } from '@/server/database';
import { handle, parseBody, parseQuery } from '@/server/http/handler';
import { ok, okList } from '@/server/http/responses';
import { listTasks } from '@/server/repositories/tasks';
import { createTask } from '@/server/services/tasks';

export const GET = handle((request: Request) => okList(listTasks(getDb(), parseQuery(request, taskListQuerySchema))));

export const POST = handle(async (request: Request) => {
  const input = await parseBody(request, taskCreateSchema);
  return ok(createTask(getDb(), input), 201);
});
