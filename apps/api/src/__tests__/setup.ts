import { afterAll, beforeEach } from 'vitest';
import { pool } from '../db/client.js';
import { resetDatabase } from './helpers.js';

// Every test starts from an empty database. Cheaper and less fragile than per-test cleanup,
// and it means a test can never depend on another's leftovers.
beforeEach(async () => {
  await resetDatabase();
});

// Without this the connection pool keeps the worker alive after the last test.
afterAll(async () => {
  await pool.end();
});
