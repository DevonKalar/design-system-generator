import { defineConfig } from 'vitest/config';
import { TEST_ENV } from './src/__tests__/test-env.js';

export default defineConfig({
  test: {
    name: 'api',
    include: ['src/**/__tests__/**/*.test.ts'],
    globalSetup: ['./src/__tests__/global-setup.ts'],
    setupFiles: ['./src/__tests__/setup.ts'],
    // Every file shares one database and truncates between tests, so running files in
    // parallel would have them delete each other's fixtures mid-test.
    fileParallelism: false,
    env: TEST_ENV,
  },
});
