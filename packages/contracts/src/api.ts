import { z } from 'zod';
import { designSystemDefinitionSchema } from './design-system.js';

export const designSystemNameSchema = z.string().trim().min(1).max(80);

export const createDesignSystemRequestSchema = z.object({
  name: designSystemNameSchema,
});
export type CreateDesignSystemRequest = z.infer<typeof createDesignSystemRequestSchema>;

export const updateDesignSystemRequestSchema = z
  .object({
    name: designSystemNameSchema.optional(),
    definition: designSystemDefinitionSchema.optional(),
  })
  .refine((body) => body.name !== undefined || body.definition !== undefined, {
    message: 'Provide at least one of "name" or "definition"',
  });
export type UpdateDesignSystemRequest = z.infer<typeof updateDesignSystemRequestSchema>;

export const designSystemIdSchema = z.uuid();

/* Response shapes. Server-produced, so plain types rather than schemas. */

export interface DesignSystemSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface DesignSystemDetail extends DesignSystemSummary {
  schemaVersion: number;
  definition: z.infer<typeof designSystemDefinitionSchema>;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface SessionResponse {
  accessToken: string;
  /** Access-token lifetime in seconds; the client refreshes shortly before this elapses. */
  expiresIn: number;
  user: AuthUser;
}
