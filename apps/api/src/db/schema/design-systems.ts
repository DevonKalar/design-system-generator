import type { DesignSystemDefinition } from '@dsg/contracts';
import { integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * `definition` is a whole document rather than normalised tables: the editor always reads and
 * writes it in full, nothing queries individual tokens across systems, and the token
 * categories change often enough that a table per category would mean a migration per
 * category. It stores inputs only — derived tokens are recomputed by @dsg/tokens on read.
 * See docs/schema.md.
 */
export const designSystems = pgTable(
  'design_systems',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    /** Which definition shape this row holds; migrated forward on read. */
    schemaVersion: integer('schema_version').notNull(),
    definition: jsonb('definition').$type<DesignSystemDefinition>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('design_systems_owner_id_slug_idx').on(table.ownerId, table.slug)],
);

export type DesignSystemRow = typeof designSystems.$inferSelect;
