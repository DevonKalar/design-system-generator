import type { ApiErrorBody } from '@dsg/contracts';
import type { z } from 'zod';
import { badRequest } from './http-error.js';

type ErrorDetails = NonNullable<ApiErrorBody['error']['details']>;

function toDetails(error: z.ZodError): ErrorDetails {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

/**
 * Parses untrusted input, throwing a 400 with field-level detail on failure. Called inside
 * handlers rather than as middleware so the return type is inferred from the schema — Express
 * middleware cannot narrow `req.body` without casting.
 *
 * Express 5 forwards errors thrown in async handlers to the error middleware automatically.
 */
export function parseOrThrow<Schema extends z.ZodType>(
  schema: Schema,
  value: unknown,
  subject: string,
): z.infer<Schema> {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw badRequest(`${subject} is invalid`, toDetails(result.error));
  }

  return result.data;
}
