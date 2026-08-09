import { resolve } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './client.js';

/**
 * Applies pending migrations then exits. Used by `pnpm db:migrate` and by the integration
 * suite's global setup, so both paths share one code path.
 */
export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: resolve(import.meta.dirname, 'migrations') });
}

// Only self-executes when run directly, so importing it from tests does not close the pool.
if (process.argv[1] === import.meta.filename) {
  await runMigrations();
  await pool.end();
  console.log('Migrations applied.');
}
