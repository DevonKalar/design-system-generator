import { beforeEach, describe, expect, it, vi } from 'vitest';
import { accessTokenStore } from '../access-token-store.js';
import { ApiError, api, apiFetch, refreshSession } from '../api-client.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const SESSION = {
  accessToken: 'fresh-token',
  expiresIn: 900,
  user: { id: 'u1', email: 'a@b.c', name: null, avatarUrl: null },
};

beforeEach(() => {
  accessTokenStore.set(null);
});

describe('apiFetch', () => {
  it('attaches the access token', async () => {
    accessTokenStore.set('current-token');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/design-systems');

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.headers.Authorization).toBe('Bearer current-token');
  });

  it('sends no Authorization header when there is no token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/design-systems');

    expect(fetchMock.mock.calls[0]![1].headers.Authorization).toBeUndefined();
  });

  it('refreshes once and retries after a 401', async () => {
    accessTokenStore.set('expired-token');

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'unauthorized' } }, 401))
      .mockResolvedValueOnce(jsonResponse(SESSION))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/api/design-systems')).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]![0]).toBe('/api/auth/refresh');
    // Retried with the token the refresh produced, not the expired one.
    expect(fetchMock.mock.calls[2]![1].headers.Authorization).toBe('Bearer fresh-token');
  });

  it('does not retry more than once', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'unauthorized' } }, 401))
      .mockResolvedValueOnce(jsonResponse(SESSION))
      .mockResolvedValueOnce(jsonResponse({ error: { code: 'unauthorized' } }, 401));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/api/x')).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('clears the stored token when the refresh itself fails', async () => {
    accessTokenStore.set('expired-token');

    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ error: { code: 'unauthorized' } }, 401))
        .mockResolvedValueOnce(jsonResponse({ error: { code: 'unauthorized' } }, 401)),
    );

    await expect(apiFetch('/api/x')).rejects.toBeInstanceOf(ApiError);
    expect(accessTokenStore.get()).toBeNull();
  });

  it('surfaces the API error code and message', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ error: { code: 'not_found', message: 'Design system not found' } }, 404),
        ),
    );

    await expect(apiFetch('/api/x')).rejects.toMatchObject({
      status: 404,
      code: 'not_found',
      message: 'Design system not found',
    });
  });

  it('returns undefined for a 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(api.delete('/api/design-systems/1')).resolves.toBeUndefined();
  });

  it('sets a JSON content type only when there is a body', async () => {
    // A Response body can only be read once, so each call needs a fresh one.
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);

    await api.post('/api/design-systems', { name: 'Acme' });
    await api.post('/api/auth/logout');

    expect(fetchMock.mock.calls[0]![1].headers['Content-Type']).toBe('application/json');
    expect(fetchMock.mock.calls[1]![1].headers['Content-Type']).toBeUndefined();
  });
});

describe('refreshSession', () => {
  it('coalesces concurrent refreshes into a single request', async () => {
    // Replaying a rotated refresh token is treated as a breach server-side, so parallel
    // callers must not each trigger their own rotation.
    let resolveFetch: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const all = Promise.all([refreshSession(), refreshSession(), refreshSession()]);
    resolveFetch!(jsonResponse(SESSION));
    const results = await all;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results.every((result) => result?.accessToken === 'fresh-token')).toBe(true);
  });

  it('allows a new refresh after the previous one settles', async () => {
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse(SESSION));
    vi.stubGlobal('fetch', fetchMock);

    await refreshSession();
    await refreshSession();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('stores the returned access token', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(SESSION)));

    await refreshSession();

    expect(accessTokenStore.get()).toBe('fresh-token');
  });
});
