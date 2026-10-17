// The owner's yard: location, season, sizes, equipment and soil lab. `@yard-config`
// is aliased at build time (config/resolve-yard-config.mjs) to the chosen JSON file,
// so server and client bundles share the same values. Import YARD from here only.

import { z } from 'zod';
import rawYardConfig from '@yard-config';
import { yardConfigSchema, type YardConfig } from './yard-schema';

export type { YardConfig, YardProduct } from './yard-schema';

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export function parseYardConfig(raw: unknown): YardConfig {
  const result = yardConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid Greenkeeper yard config (see config/greenkeeper.example.json for the shape):\n${z.prettifyError(result.error)}`,
    );
  }
  return deepFreeze(result.data);
}

export const YARD: Readonly<YardConfig> = parseYardConfig(rawYardConfig);
