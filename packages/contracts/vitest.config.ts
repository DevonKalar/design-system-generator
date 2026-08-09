import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'contracts',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
});
