/**
 * Every non-2xx response from the API has this body, produced by a single error handler.
 * See docs/api.md.
 */
export const ERROR_CODES = [
  'validation_error',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  'oauth_failed',
  'internal_error',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    /** Field-level detail, populated for validation_error. */
    details?: Array<{ path: string; message: string }>;
  };
}
