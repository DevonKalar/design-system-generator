import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * One row per issued refresh token. Rotation inserts a replacement and revokes the old row
 * rather than updating in place, so a presented-but-revoked token is detectable — see
 * docs/auth.md for the reuse-detection rule.
 */
export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** SHA-256 of the token. The plaintext exists only in the client's cookie. */
    tokenHash: text('token_hash').notNull().unique(),
    /** Shared by every token descended from one login, so a leak can revoke the whole chain. */
    familyId: uuid('family_id').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('refresh_tokens_family_id_idx').on(table.familyId),
    index('refresh_tokens_user_id_idx').on(table.userId),
  ],
);

export type RefreshTokenRow = typeof refreshTokens.$inferSelect;
