import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Not Vite's default 5173, which collides with any other Vite app running alongside.
    // strictPort makes a clash fail rather than silently move: the port is baked into
    // WEB_ORIGIN and into Google's registered redirect URI.
    port: 5180,
    strictPort: true,
    proxy: {
      // Same-origin in development, so the httpOnly refresh cookie needs no CORS or
      // SameSite exceptions. See apps/api/src/app.ts.
      '/api': { target: 'http://localhost:3000' },
    },
  },
  test: {
    name: 'web',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
  },
});
