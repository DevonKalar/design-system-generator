import {
  CURRENT_SCHEMA_VERSION,
  createDefaultDefinition,
  type DesignSystemDetail,
  type DesignSystemSummary,
  type UpdateDesignSystemRequest,
} from '@dsg/contracts';
import { emitDesignSystem, type EmittedFile } from '@dsg/tokens';
import type { DesignSystemRow } from '../../db/schema/index.js';
import { notFound } from '../../lib/http-error.js';
import { slugify } from '../../lib/slug.js';
import * as repository from './repository.js';

function toSummary(row: DesignSystemRow): DesignSystemSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDetail(row: DesignSystemRow): DesignSystemDetail {
  assertReadableVersion(row);

  return {
    ...toSummary(row),
    schemaVersion: row.schemaVersion,
    definition: row.definition,
  };
}

/**
 * Guards against a rollback reading documents written by a newer deploy. When the definition
 * shape next changes, this is where a forward migration hooks in — silently handing an
 * unknown shape to the token engine would produce a broken export rather than an error.
 */
function assertReadableVersion(row: DesignSystemRow): void {
  if (row.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Design system ${row.id} has schema version ${row.schemaVersion}, but this build only understands ${CURRENT_SCHEMA_VERSION}`,
    );
  }
}

/** Appends -2, -3 … until the slug is free within this owner's systems. */
function resolveUniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;

  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

export async function listForOwner(ownerId: string): Promise<DesignSystemSummary[]> {
  const rows = await repository.listForOwner(ownerId);
  return rows.map((row) => toSummary(row));
}

export async function getForOwner(id: string, ownerId: string): Promise<DesignSystemDetail> {
  const row = await repository.findForOwner(id, ownerId);
  if (!row) {
    throw notFound('Design system not found');
  }
  return toDetail(row);
}

export async function createForOwner(ownerId: string, name: string): Promise<DesignSystemDetail> {
  const taken = new Set(await repository.findSlugsForOwner(ownerId));

  const row = await repository.insertForOwner({
    ownerId,
    name,
    slug: resolveUniqueSlug(slugify(name), taken),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    definition: createDefaultDefinition(),
  });

  return toDetail(row);
}

export async function updateForOwner(
  id: string,
  ownerId: string,
  patch: UpdateDesignSystemRequest,
): Promise<DesignSystemDetail> {
  const existing = await repository.findForOwner(id, ownerId);
  if (!existing) {
    throw notFound('Design system not found');
  }

  const renamed = patch.name !== undefined && patch.name !== existing.name;
  let slug: string | undefined;

  if (renamed) {
    const taken = new Set(await repository.findSlugsForOwner(ownerId));
    taken.delete(existing.slug);
    slug = resolveUniqueSlug(slugify(patch.name!), taken);
  }

  const row = await repository.updateForOwner(id, ownerId, {
    ...(patch.name === undefined ? {} : { name: patch.name }),
    ...(slug === undefined ? {} : { slug }),
    ...(patch.definition === undefined ? {} : { definition: patch.definition }),
  });

  if (!row) {
    throw notFound('Design system not found');
  }
  return toDetail(row);
}

export async function deleteForOwner(id: string, ownerId: string): Promise<void> {
  const deleted = await repository.deleteForOwner(id, ownerId);
  if (!deleted) {
    throw notFound('Design system not found');
  }
}

export interface ExportBundle {
  slug: string;
  files: EmittedFile[];
}

/** Uses the same emit function the editor previews with, so a download cannot drift from it. */
export async function exportForOwner(id: string, ownerId: string): Promise<ExportBundle> {
  const row = await repository.findForOwner(id, ownerId);
  if (!row) {
    throw notFound('Design system not found');
  }
  assertReadableVersion(row);

  return {
    slug: row.slug,
    files: emitDesignSystem(row.definition, row.name).files,
  };
}
