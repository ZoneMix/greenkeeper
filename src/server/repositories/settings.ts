import type { SettingsUpdateInput } from '@/lib/domain/schemas';
import type { LawnSettings } from '@/lib/domain/types';
import type { Db } from '../db/types';

const SETTINGS_FIELDS = [
  'total_sqft',
  'front_sqft',
  'back_sqft',
  'shade_percentage',
  'spreader_model',
  'city',
  'state',
  'usda_zone',
  'latitude',
  'longitude',
  'mower_brand',
  'mower_model',
] as const satisfies ReadonlyArray<keyof SettingsUpdateInput>;

export function getSettings(db: Db): LawnSettings {
  const row = db.prepare('SELECT * FROM lawn_settings WHERE id = 1').get() as LawnSettings | undefined;
  if (!row) throw new Error('lawn_settings row is missing; migrations did not run');
  return row;
}

export function updateSettings(db: Db, patch: SettingsUpdateInput): LawnSettings {
  // Column names come from a fixed allowlist, never from user input.
  const keys = SETTINGS_FIELDS.filter((key) => patch[key] !== undefined);
  if (keys.length > 0) {
    const assignments = keys.map((key) => `${key} = @${key}`).join(', ');
    const params = Object.fromEntries(keys.map((key) => [key, patch[key]]));
    db.prepare(`UPDATE lawn_settings SET ${assignments}, updated_at = datetime('now') WHERE id = 1`).run(params);
  }
  return getSettings(db);
}
