import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, type UserRow } from '../db/schema/index.js';
import { signAccessToken } from '../modules/auth/tokens.js';

/** CASCADE covers design_systems and refresh_tokens through their owner foreign keys. */
export async function resetDatabase(): Promise<void> {
  await db.execute(sql`TRUNCATE TABLE users RESTART IDENTITY CASCADE`);
}

let userCounter = 0;

export async function createTestUser(overrides: Partial<UserRow> = {}): Promise<UserRow> {
  userCounter += 1;

  const rows = await db
    .insert(users)
    .values({
      googleSub: `google-sub-${userCounter}`,
      email: `user${userCounter}@example.com`,
      name: `Test User ${userCounter}`,
      ...overrides,
    })
    .returning();

  const row = rows[0];
  if (!row) throw new Error('Failed to insert test user');
  return row;
}

export async function authHeader(userId: string): Promise<string> {
  return `Bearer ${await signAccessToken(userId)}`;
}
