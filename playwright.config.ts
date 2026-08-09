import { defineConfig, devices } from '@playwright/test';
import { E2E_API_PORT, E2E_ENV, E2E_PORT } from './e2e/env.js';

const isCI = Boolean(process.env['CI']);

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  // One database, one dev server: parallel specs would race on shared state.
  workers: 1,
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: 'list',

  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: 'on-first-retry',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: [
    {
      command: 'pnpm --filter @dsg/api dev',
      url: `http://localhost:${E2E_API_PORT}/api/health`,
      env: E2E_ENV,
      // Never reuse in CI, and never reuse locally either: a dev server already running on
      // this port is pointed at the dev database, and the run would write into it.
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm --filter @dsg/web dev',
      url: `http://localhost:${E2E_PORT}`,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
