import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import { notFound } from './lib/http-error.js';
import { errorHandler } from './middleware/error-handler.js';
import { authRouter } from './modules/auth/routes.js';
import { designSystemsRouter } from './modules/design-systems/routes.js';

/**
 * Builds the app without binding a port, so the integration suite can drive the real thing
 * in-process via supertest. `server.ts` is the only place that listens.
 *
 * There is no CORS layer: the Vite dev server proxies /api to this app, so the browser only
 * ever sees one origin and the refresh cookie works without SameSite exceptions. Splitting
 * web and API across origins would mean adding an explicit single-origin CORS allowlist.
 */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/design-systems', designSystemsRouter);

  // Keeps the "every non-2xx uses the standard error body" contract true for bad URLs too,
  // instead of falling through to Express's HTML 404.
  app.use((req, _res, next) => {
    next(notFound(`No route for ${req.method} ${req.path}`));
  });

  app.use(errorHandler);

  return app;
}
