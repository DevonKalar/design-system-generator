import type { ApiErrorBody } from '@dsg/contracts';
import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../lib/http-error.js';

/** Postgres unique_violation. */
const UNIQUE_VIOLATION = '23505';

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === UNIQUE_VIOLATION
  );
}

/**
 * The single place a response body is shaped for a failure. Registered last, after all routes.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  // A streamed export may have already flushed headers; Express's default handler is the only
  // thing that can destroy the connection cleanly at that point.
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof HttpError) {
    const body: ApiErrorBody = {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    };
    res.status(error.status).json(body);
    return;
  }

  // A unique index rejecting a write is a genuine conflict, not a server fault. Losing a
  // slug race is the expected case.
  if (isUniqueViolation(error)) {
    const body: ApiErrorBody = {
      error: { code: 'conflict', message: 'That name is already taken' },
    };
    res.status(409).json(body);
    return;
  }

  console.error('Unhandled error:', error);

  const body: ApiErrorBody = {
    error: { code: 'internal_error', message: 'Something went wrong' },
  };
  res.status(500).json(body);
}
