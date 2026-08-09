import { defineConfig } from 'vitest/config';

// Each package/app owns its own vitest config; this only aggregates them so a single
// `pnpm test` at the root runs everything.
export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*'],
  },
});
