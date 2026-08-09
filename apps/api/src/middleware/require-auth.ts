import type { NextFunction, Request, Response } from 'express';
import { unauthorized } from '../lib/http-error.js';
import { verifyAccessToken } from '../modules/auth/tokens.js';

const BEARER_PREFIX = 'Bearer ';

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;

  if (!header?.startsWith(BEARER_PREFIX)) {
    next(unauthorized());
    return;
  }

  try {
    req.auth = await verifyAccessToken(header.slice(BEARER_PREFIX.length));
    next();
  } catch {
    // Expired and forged tokens are indistinguishable to the client on purpose; it responds
    // to either by refreshing.
    next(unauthorized('Access token is invalid or expired'));
  }
}

/**
 * Reads the identity requireAuth attached. Throwing rather than returning undefined means a
 * route mounted without requireAuth fails immediately instead of querying with `undefined`
 * as the owner id.
 */
export function authenticatedUserId(req: Request): string {
  if (!req.auth) {
    throw new Error('authenticatedUserId called on a route that is not behind requireAuth');
  }
  return req.auth.userId;
}
