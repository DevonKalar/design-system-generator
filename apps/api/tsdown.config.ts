import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/server.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  deps: {
    // The workspace packages publish TypeScript source, so they must be bundled in — left
    // external they would emit bare `@dsg/*` imports that Node cannot resolve from dist/.
    alwaysBundle: [/^@dsg\//],
  },
});
