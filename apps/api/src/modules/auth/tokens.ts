import { createHash, randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../../config/env.js';

const secret = new TextEncoder().encode(env.JWT_SECRET);

/**
 * Short-lived so a leaked access token expires on its own; the client holds it in memory and
 * silently refreshes. Long-lived refresh tokens live in an httpOnly cookie instead.
 */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

export function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<{ userId: string }> {
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });

  if (!payload.sub) {
    throw new Error('Access token has no subject claim');
  }

  return { userId: payload.sub };
}

/** Refresh tokens are opaque random strings, not JWTs — they must be revocable server-side. */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Only the hash is stored, so a database leak does not yield usable sessions. */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
