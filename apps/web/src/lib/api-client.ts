import type { ApiErrorBody, ErrorCode, SessionResponse } from '@dsg/contracts';
import { accessTokenStore } from './access-token-store.js';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details: ApiErrorBody['error']['details'];

  constructor(status: number, body: ApiErrorBody['error']) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;

  return new ApiError(
    response.status,
    body?.error ?? { code: 'internal_error', message: response.statusText },
  );
}

let refreshInFlight: Promise<SessionResponse | null> | null = null;

async function requestRefresh(): Promise<SessionResponse | null> {
  const response = await fetch('/api/auth/refresh', { method: 'POST' });

  if (!response.ok) {
    accessTokenStore.set(null);
    return null;
  }

  const session = (await response.json()) as SessionResponse;
  accessTokenStore.set(session.accessToken);
  return session;
}

/**
 * Single-flight. Refresh tokens rotate, and the server treats a replayed token as evidence of
 * a breach and kills the whole session family — so several requests hitting 401 at once must
 * share one refresh rather than racing to rotate the same token.
 */
export function refreshSession(): Promise<SessionResponse | null> {
  refreshInFlight ??= requestRefresh().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

function send(path: string, init: RequestInit, token: string | null): Promise<Response> {
  return fetch(path, {
    ...init,
    headers: {
      ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token === null ? {} : { Authorization: `Bearer ${token}` }),
      ...init.headers,
    },
  });
}

/**
 * Issues a request, refreshing once and retrying if the access token has expired. Returns the
 * raw Response so non-JSON endpoints (the zip export) can read the body themselves.
 */
export async function apiRequest(path: string, init: RequestInit = {}): Promise<Response> {
  let response = await send(path, init, accessTokenStore.get());

  if (response.status === 401) {
    const session = await refreshSession();
    if (session) {
      response = await send(path, init, session.accessToken);
    }
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  return response;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiRequest(path, init);

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/**
 * Downloads an authenticated file. A plain link navigation cannot carry the Authorization
 * header, so the bytes are fetched and handed to the browser as an object URL instead.
 */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const response = await apiRequest(path);
  const url = URL.createObjectURL(await response.blob());

  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const api = {
  get: <T>(path: string): Promise<T> => apiFetch<T>(path),

  post: <T>(path: string, body?: unknown): Promise<T> =>
    apiFetch<T>(path, {
      method: 'POST',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),

  patch: <T>(path: string, body: unknown): Promise<T> =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: (path: string): Promise<void> => apiFetch<void>(path, { method: 'DELETE' }),
};
