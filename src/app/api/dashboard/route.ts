import { todayIso } from '@/lib/domain/dates';
import { getDb } from '@/server/database';
import { handle } from '@/server/http/handler';
import { ok } from '@/server/http/responses';
import { getDashboard } from '@/server/services/dashboard';

export const GET = handle(() => ok(getDashboard(getDb(), todayIso())));
