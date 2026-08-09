import { TEST_ENV } from './test-env.js';

/**
 * Brings the test database up to date once per run. Migrating here rather than per-file keeps
 * the suite honest — it exercises the same migration files that ship.
 */
export default async function setup(): Promise<void> {
  Object.assign(process.env, TEST_ENV);

  // Imported lazily so the environment is in place before config/env.ts validates it.
  const { runMigrations } = await import('../db/migrate.js');
  const { pool } = await import('../db/client.js');

  await runMigrations();
  await pool.end();
}
