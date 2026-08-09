/**
 * Environment for the e2e run, shared by the Playwright global setup and the servers it
 * starts. It overrides the developer's .env — apps/api/src/config/load-env.ts treats the file
 * as defaults and leaves already-set variables alone.
 *
 * A dedicated database keeps e2e runs from writing into the dev database.
 */
export const E2E_PORT = 5180;
export const E2E_API_PORT = 3000;

export const E2E_ENV: Record<string, string> = {
  NODE_ENV: 'development',
  API_PORT: String(E2E_API_PORT),
  WEB_ORIGIN: `http://localhost:${E2E_PORT}`,
  DATABASE_URL: process.env['E2E_DATABASE_URL'] ?? 'postgres://dsg:dsg@localhost:5433/dsg_e2e',
  JWT_SECRET: 'e2e-only-secret-at-least-32-characters-long',
  GOOGLE_CLIENT_ID: 'e2e-client-id',
  GOOGLE_CLIENT_SECRET: 'e2e-client-secret',
  GOOGLE_REDIRECT_URI: `http://localhost:${E2E_API_PORT}/api/auth/google/callback`,
  // Google's consent screen cannot be driven from a test, so the run mints its session
  // through the flag-guarded test-login route instead. See docs/auth.md.
  AUTH_TEST_LOGIN_ENABLED: 'true',
};
