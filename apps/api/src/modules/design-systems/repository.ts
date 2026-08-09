import type { DesignSystemDefinition } from '@dsg/contracts';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { designSystems, type DesignSystemRow } from '../../db/schema/index.js';

/**
 * Every function here takes `ownerId` as a required argument — there is deliberately no
 * `findById(id)` overload. Authorization is therefore not something a caller can forget: an
 * unscoped read is not expressible. See docs/api.md.
 */

export function listForOwner(ownerId: string): Promise<DesignSystemRow[]> {
  return db
    .select()
    .from(designSystems)
    .where(eq(designSystems.ownerId, ownerId))
    .orderBy(desc(designSystems.updatedAt));
}

export async function findForOwner(
  id: string,
  ownerId: string,
): Promise<DesignSystemRow | undefined> {
  const rows = await db
    .select()
    .from(designSystems)
    .where(and(eq(designSystems.id, id), eq(designSystems.ownerId, ownerId)))
    .limit(1);

  return rows[0];
}

export async function findSlugsForOwner(ownerId: string): Promise<string[]> {
  const rows = await db
    .select({ slug: designSystems.slug })
    .from(designSystems)
    .where(eq(designSystems.ownerId, ownerId));

  return rows.map((row) => row.slug);
}

export async function insertForOwner(input: {
  ownerId: string;
  name: string;
  slug: string;
  schemaVersion: number;
  definition: DesignSystemDefinition;
}): Promise<DesignSystemRow> {
  const rows = await db.insert(designSystems).values(input).returning();

  const row = rows[0];
  if (!row) {
    throw new Error('Insert returned no row');
  }
  return row;
}

export async function updateForOwner(
  id: string,
  ownerId: string,
  patch: { name?: string; slug?: string; definition?: DesignSystemDefinition },
): Promise<DesignSystemRow | undefined> {
  const rows = await db
    .update(designSystems)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(designSystems.id, id), eq(designSystems.ownerId, ownerId)))
    .returning();

  return rows[0];
}

export async function deleteForOwner(id: string, ownerId: string): Promise<boolean> {
  const rows = await db
    .delete(designSystems)
    .where(and(eq(designSystems.id, id), eq(designSystems.ownerId, ownerId)))
    .returning({ id: designSystems.id });

  return rows.length > 0;
}
