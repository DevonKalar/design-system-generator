import { timingSafeEqual } from 'node:crypto';
import type { SessionResponse } from '@dsg/contracts';
import { Router, type Response } from 'express';
import { z } from 'zod';
import { env, isProduction } from '../../config/env.js';
import { HttpError, unauthorized } from '../../lib/http-error.js';
import { parseOrThrow } from '../../lib/validate.js';
import { authenticatedUserId, requireAuth } from '../../middleware/require-auth.js';
import * as userRepository from '../users/repository.js';
import { createTransaction, googleOAuth, type OAuthTransaction } from './google.js';
import * as service from './service.js';
import { REFRESH_TOKEN_TTL_SECONDS } from './tokens.js';

export const authRouter = Router();

const REFRESH_COOKIE = 'dsg_refresh';
const OAUTH_TX_COOKIE = 'dsg_oauth_tx';
const OAUTH_TX_TTL_MS = 10 * 60 * 1000;

/** Scoped to /api/auth so the cookie is never attached to ordinary API calls. */
const COOKIE_PATH = '/api/auth';

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    // Cannot be set over plain http, so dev (http://localhost) must leave it off.
    secure: isProduction,
    sameSite: 'lax',
    path: COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH });
}

function toSessionResponse(session: service.IssuedSession): SessionResponse {
  return {
    accessToken: session.accessToken,
    expiresIn: session.expiresIn,
    user: session.user,
  };
}

function safeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // timingSafeEqual throws on length mismatch, which would itself leak length.
  return left.length === right.length && timingSafeEqual(left, right);
}

const transactionSchema = z.object({
  state: z.string().min(1),
  codeVerifier: z.string().min(1),
});

function readTransaction(raw: unknown): OAuthTransaction | undefined {
  if (typeof raw !== 'string') return undefined;

  try {
    const decoded: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    const parsed = transactionSchema.safeParse(decoded);
    return parsed.success ? parsed.data : undefined;
  } catch {
    // A malformed cookie is indistinguishable from no cookie: the request restarts login.
    return undefined;
  }
}

authRouter.get('/google', (_req, res) => {
  const transaction = createTransaction();

  res.cookie(OAUTH_TX_COOKIE, Buffer.from(JSON.stringify(transaction)).toString('base64url'), {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: COOKIE_PATH,
    maxAge: OAUTH_TX_TTL_MS,
  });

  res.redirect(googleOAuth.buildAuthUrl(transaction));
});

const callbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

authRouter.get('/google/callback', async (req, res) => {
  const transaction = readTransaction(req.cookies?.[OAUTH_TX_COOKIE]);
  res.clearCookie(OAUTH_TX_COOKIE, { path: COOKIE_PATH });

  try {
    if (!transaction) {
      throw new HttpError(400, 'oauth_failed', 'Login session expired — start again');
    }

    const query = parseOrThrow(callbackQuerySchema, req.query, 'Callback query');

    // Without this an attacker could have the victim's browser redeem a code they control.
    if (!safeEquals(query.state, transaction.state)) {
      throw new HttpError(400, 'oauth_failed', 'OAuth state mismatch');
    }

    const profile = await googleOAuth.exchangeCode(query.code, transaction.codeVerifier);
    const user = await userRepository.upsertFromGoogle(profile);
    const session = await service.startSession(user, req.headers['user-agent']);

    setRefreshCookie(res, session.refreshToken);

    // The access token is deliberately not in the URL — it would land in browser history and
    // in the Referer header. The app calls /refresh on load to pick one up from the cookie.
    res.redirect(env.WEB_ORIGIN);
  } catch (error) {
    // A failed login is a browser navigation, so a JSON error body would strand the user on a
    // blank page. Unexpected errors still bubble to the error handler as a 500.
    if (error instanceof HttpError) {
      res.redirect(`${env.WEB_ORIGIN}/login?error=${encodeURIComponent(error.code)}`);
      return;
    }
    throw error;
  }
});

authRouter.post('/refresh', async (req, res) => {
  const presented: unknown = req.cookies?.[REFRESH_COOKIE];

  if (typeof presented !== 'string' || presented.length === 0) {
    throw unauthorized('No refresh token');
  }

  try {
    const session = await service.rotateSession(presented, req.headers['user-agent']);
    setRefreshCookie(res, session.refreshToken);
    res.json(toSessionResponse(session));
  } catch (error) {
    // The cookie is dead either way; leaving it would make the client retry forever.
    clearRefreshCookie(res);
    throw error;
  }
});

authRouter.post('/logout', async (req, res) => {
  const presented: unknown = req.cookies?.[REFRESH_COOKIE];

  await service.endSession(typeof presented === 'string' ? presented : undefined);
  clearRefreshCookie(res);

  res.status(204).end();
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await userRepository.findById(authenticatedUserId(req));

  if (!user) {
    throw unauthorized('Account no longer exists');
  }

  res.json(service.toAuthUser(user));
});

/**
 * Mounted only when AUTH_TEST_LOGIN_ENABLED is set, which config/env.ts refuses to accept in
 * production. It mints a session with no credential check so Playwright can reach the app
 * without driving Google's consent screen. See docs/auth.md.
 */
if (env.AUTH_TEST_LOGIN_ENABLED) {
  const testLoginSchema = z.object({
    email: z.email().default('playwright@example.com'),
  });

  authRouter.post('/test-login', async (req, res) => {
    const body = parseOrThrow(testLoginSchema, req.body ?? {}, 'Request body');

    const user = await userRepository.upsertFromGoogle({
      googleSub: `test-login|${body.email}`,
      email: body.email,
      name: 'Playwright User',
      avatarUrl: null,
    });

    const session = await service.startSession(user, req.headers['user-agent']);
    setRefreshCookie(res, session.refreshToken);

    res.json(toSessionResponse(session));
  });
}
