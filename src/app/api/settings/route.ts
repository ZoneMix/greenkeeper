import { settingsUpdateSchema } from '@/lib/domain/schemas';
import { getDb } from '@/server/database';
import { handle, parseBody } from '@/server/http/handler';
import { ok } from '@/server/http/responses';
import { getSettings, updateSettings } from '@/server/repositories/settings';

export const GET = handle(() => ok(getSettings(getDb())));

/** Partial update: only the fields sent are changed. */
export const PUT = handle(async (request: Request) => {
  const input = await parseBody(request, settingsUpdateSchema);
  return ok(updateSettings(getDb(), input));
});
