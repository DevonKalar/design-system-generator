import type { ApiErrorBody, ErrorCode } from '@dsg/contracts';

type ErrorDetails = NonNullable<ApiErrorBody['error']['details']>;

/** Anything thrown as an HttpError reaches the client verbatim; anything else becomes a 500. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details: ErrorDetails | undefined;

  constructor(status: number, code: ErrorCode, message: string, details?: ErrorDetails) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: ErrorDetails): HttpError =>
  new HttpError(400, 'validation_error', message, details);

export const unauthorized = (message = 'Authentication required'): HttpError =>
  new HttpError(401, 'unauthorized', message);

export const notFound = (message = 'Not found'): HttpError =>
  new HttpError(404, 'not_found', message);

export const conflict = (message: string): HttpError => new HttpError(409, 'conflict', message);
