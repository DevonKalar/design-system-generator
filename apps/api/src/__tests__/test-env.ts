/**
 * The integration suite's environment. Imported by both vitest.config.ts (for test workers)
 * and global-setup.ts (which runs migrations outside a worker), so the two cannot drift.
 *
 * Points at a separate database from development: the suite truncates between tests.
 */
export const TEST_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  DATABASE_URL: process.env['TEST_DATABASE_URL'] ?? 'postgres://dsg:dsg@localhost:5433/dsg_test',
  API_PORT: '3000',
  WEB_ORIGIN: 'http://localhost:5180',
  JWT_SECRET: 'test-only-secret-at-least-32-characters-long',
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  GOOGLE_REDIRECT_URI: 'http://localhost:3000/api/auth/google/callback',
  AUTH_TEST_LOGIN_ENABLED: 'false',
};
