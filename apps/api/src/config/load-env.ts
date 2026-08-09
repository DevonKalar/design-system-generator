import { existsSync } from 'node:fs';
import { dirname, join, parse } from 'node:path';

/**
 * Loads the repo-root .env before anything reads process.env. Imported by config/env.ts and
 * drizzle.config.ts so neither depends on the caller's working directory.
 *
 * The root is found by walking up for the workspace manifest rather than from
 * `import.meta.dirname`: drizzle-kit transpiles its config to CJS, where that is undefined.
 *
 * Skipped under test — the vitest config injects its own environment, and overwriting it with
 * a developer's local .env would silently point the suite at the dev database.
 *
 * `process.loadEnvFile` does not overwrite variables that are already set, so the file acts as
 * a default layer. The Playwright config relies on that to point the e2e run at its own
 * database and enable the test-login route without editing anyone's .env.
 */
function findRepoRoot(from: string): string | undefined {
  let current = from;

  for (;;) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current || current === parse(current).root) {
      return undefined;
    }
    current = parent;
  }
}

if (process.env['NODE_ENV'] !== 'test') {
  const root = findRepoRoot(process.cwd());
  const envPath = root ? join(root, '.env') : undefined;

  if (envPath && existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }
}
