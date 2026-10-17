import { getDb } from '@/server/database';
import { LATEST_SCHEMA_VERSION } from '@/server/db/migrations';
import { handle } from '@/server/http/handler';
import { ok } from '@/server/http/responses';

export const GET = handle(() => {
  const version = getDb().pragma('user_version', { simple: true });
  return ok({ status: 'ok', schema_version: Number(version), expected_schema_version: LATEST_SCHEMA_VERSION });
});
