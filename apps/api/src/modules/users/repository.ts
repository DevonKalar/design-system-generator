import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { users, type UserRow } from '../../db/schema/index.js';
import type { GoogleProfile } from '../auth/google.js';

/**
 * Matches on the Google subject rather than email: a Google account's email can change, and
 * matching on it would let a reassigned address take over an existing account.
 */
export async function upsertFromGoogle(profile: GoogleProfile): Promise<UserRow> {
  const rows = await db
    .insert(users)
    .values({
      googleSub: profile.googleSub,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    })
    .onConflictDoUpdate({
      target: users.googleSub,
      set: {
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        updatedAt: new Date(),
      },
    })
    .returning();

  const row = rows[0];
  if (!row) {
    throw new Error('User upsert returned no row');
  }
  return row;
}

export async function findById(id: string): Promise<UserRow | undefined> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}
