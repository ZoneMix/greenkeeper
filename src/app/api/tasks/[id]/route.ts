import { todayIso } from '@/lib/domain/dates';
import { taskUpdateSchema } from '@/lib/domain/schemas';
import { getDb } from '@/server/database';
import { handle, parseBody, parseId, type IdRouteContext } from '@/server/http/handler';
import { ok } from '@/server/http/responses';
import { getTask, patchTask, removeTask } from '@/server/services/tasks';

export const GET = handle(async (_request: Request, context: IdRouteContext) => ok(getTask(getDb(), await parseId(context))));

export const PATCH = handle(async (request: Request, context: IdRouteContext) => {
  const id = await parseId(context);
  const input = await parseBody(request, taskUpdateSchema);
  return ok(patchTask(getDb(), id, input, todayIso()));
});

export const DELETE = handle(async (_request: Request, context: IdRouteContext) =>
  ok(removeTask(getDb(), await parseId(context))),
);
