import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { resolveYardConfig, YARD_CONFIG_MODULE } from './config/resolve-yard-config.mjs';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Same yard config the app would build with; tests assert against YARD values.
      [YARD_CONFIG_MODULE]: resolveYardConfig(),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/api/**/*.test.ts'],
    // Every test file gets its own temp database; never touch ./data.
    env: { LAWN_WEATHER_DISABLED: '1' },
    restoreMocks: true,
  },
});
