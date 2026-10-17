import os from 'node:os';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const PORT = 3478;
// A throwaway database per run; never ./data.
const DB_PATH = path.join(os.tmpdir(), `greenkeeper-e2e-${Date.now()}`, 'lawn.db');

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `pnpm exec next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    // Weather is off so the run needs no network.
    env: { LAWN_DB_PATH: DB_PATH, LAWN_WEATHER_DISABLED: '1' },
  },
});
