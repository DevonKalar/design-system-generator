import type { AuthUser, SessionResponse } from '@dsg/contracts';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { refreshTokens, users, type UserRow } from '../../db/schema/index.js';
import { unauthorized } from '../../lib/http-error.js';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
} from './tokens.js';

export interface IssuedSession extends SessionResponse {
  /** Plaintext refresh token — belongs in the httpOnly cookie and nowhere else. */
  refreshToken: string;
}

export function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatarUrl,
  };
}

function expiryDate(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
}

async function issueSession(
  user: UserRow,
  familyId: string,
  userAgent: string | undefined,
): Promise<IssuedSession> {
  const refreshToken = generateRefreshToken();

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    familyId,
    expiresAt: expiryDate(),
    userAgent: userAgent ?? null,
  });

  return {
    accessToken: await signAccessToken(user.id),
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    user: toAuthUser(user),
    refreshToken,
  };
}

/** Starts a new token family. Every login gets its own, so revoking one leaves others alone. */
export function startSession(user: UserRow, userAgent: string | undefined): Promise<IssuedSession> {
  return issueSession(user, crypto.randomUUID(), userAgent);
}

async function revokeFamily(familyId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)));
}

/**
 * Rotates a refresh token: the presented token is revoked and a replacement is issued in the
 * same family.
 *
 * A token that is presented after it has already been revoked means the plaintext leaked —
 * the legitimate client would have moved on to its replacement. There is no way to tell the
 * attacker's request from the victim's, so the whole family is revoked and both are forced to
 * log in again. See docs/auth.md.
 */
export async function rotateSession(
  presentedToken: string,
  userAgent: string | undefined,
): Promise<IssuedSession> {
  const tokenHash = hashRefreshToken(presentedToken);

  const existing = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  const row = existing[0];
  if (!row) {
    throw unauthorized('Refresh token is not recognised');
  }

  if (row.revokedAt) {
    await revokeFamily(row.familyId);
    throw unauthorized('Refresh token has already been used');
  }

  if (row.expiresAt.getTime() <= Date.now()) {
    await revokeFamily(row.familyId);
    throw unauthorized('Refresh token has expired');
  }

  // Conditional so two concurrent refreshes cannot both rotate the same token; the loser
  // updates zero rows and is treated as reuse.
  const claimed = await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.id, row.id), isNull(refreshTokens.revokedAt)))
    .returning({ id: refreshTokens.id });

  if (claimed.length === 0) {
    await revokeFamily(row.familyId);
    throw unauthorized('Refresh token has already been used');
  }

  const userRows = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
  const user = userRows[0];
  if (!user) {
    throw unauthorized('Account no longer exists');
  }

  return issueSession(user, row.familyId, userAgent);
}

/** Ends the session the token belongs to. Unknown tokens are a no-op — logout is idempotent. */
export async function endSession(presentedToken: string | undefined): Promise<void> {
  if (!presentedToken) return;

  const rows = await db
    .select({ familyId: refreshTokens.familyId })
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, hashRefreshToken(presentedToken)))
    .limit(1);

  const row = rows[0];
  if (row) {
    await revokeFamily(row.familyId);
  }
}
