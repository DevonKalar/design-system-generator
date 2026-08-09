import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../../app.js';
import { db } from '../../../db/client.js';
import { refreshTokens } from '../../../db/schema/index.js';
import { googleOAuth, type GoogleProfile } from '../google.js';
import { hashRefreshToken } from '../tokens.js';

const app = createApp();

const PROFILE: GoogleProfile = {
  googleSub: 'google-sub-abc',
  email: 'ada@example.com',
  name: 'Ada Lovelace',
  avatarUrl: 'https://example.com/ada.png',
};

/** Extracts a cookie's value from a Set-Cookie header list. */
function cookieValue(setCookie: string[] | undefined, name: string): string | undefined {
  const header = setCookie?.find((entry) => entry.startsWith(`${name}=`));
  return header?.split(';')[0]?.split('=')[1];
}

function setCookieHeaders(response: request.Response): string[] {
  const raw = response.headers['set-cookie'];
  return Array.isArray(raw) ? raw : raw ? [raw] : [];
}

/** Drives the Google callback with the network calls stubbed, returning the refresh token. */
async function login(profile: GoogleProfile = PROFILE): Promise<string> {
  const start = await request(app).get('/api/auth/google');
  const transaction = cookieValue(setCookieHeaders(start), 'dsg_oauth_tx')!;
  const state = new URL(start.headers['location']!).searchParams.get('state')!;

  const spy = vi.spyOn(googleOAuth, 'exchangeCode').mockResolvedValue(profile);

  const callback = await request(app)
    .get(`/api/auth/google/callback?code=auth-code&state=${encodeURIComponent(state)}`)
    .set('Cookie', `dsg_oauth_tx=${transaction}`);

  spy.mockRestore();

  expect(callback.status).toBe(302);
  return cookieValue(setCookieHeaders(callback), 'dsg_refresh')!;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/auth/google', () => {
  it('redirects to Google with PKCE and state', async () => {
    const response = await request(app).get('/api/auth/google');

    expect(response.status).toBe(302);

    const url = new URL(response.headers['location']!);
    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBeTruthy();
    expect(url.searchParams.get('state')).toBeTruthy();
    expect(url.searchParams.get('scope')).toContain('email');
  });

  it('stores the verifier in an httpOnly cookie the browser cannot read', async () => {
    const response = await request(app).get('/api/auth/google');
    const header = setCookieHeaders(response).find((entry) => entry.startsWith('dsg_oauth_tx='));

    expect(header).toContain('HttpOnly');
    expect(header).toContain('Path=/api/auth');
  });

  it('never puts the code verifier in the redirect URL', async () => {
    const response = await request(app).get('/api/auth/google');
    const transaction = cookieValue(setCookieHeaders(response), 'dsg_oauth_tx')!;
    const { codeVerifier } = JSON.parse(Buffer.from(transaction, 'base64url').toString('utf8'));

    expect(response.headers['location']).not.toContain(codeVerifier);
  });
});

describe('GET /api/auth/google/callback', () => {
  it('creates the user and sets a refresh cookie', async () => {
    const refreshToken = await login();

    expect(refreshToken).toBeTruthy();

    const session = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `dsg_refresh=${refreshToken}`);

    expect(session.status).toBe(200);
    expect(session.body.user.email).toBe(PROFILE.email);
    expect(session.body.user.name).toBe(PROFILE.name);
  });

  it('does not leak the access token into the redirect URL', async () => {
    const start = await request(app).get('/api/auth/google');
    const transaction = cookieValue(setCookieHeaders(start), 'dsg_oauth_tx')!;
    const state = new URL(start.headers['location']!).searchParams.get('state')!;

    vi.spyOn(googleOAuth, 'exchangeCode').mockResolvedValue(PROFILE);

    const callback = await request(app)
      .get(`/api/auth/google/callback?code=auth-code&state=${encodeURIComponent(state)}`)
      .set('Cookie', `dsg_oauth_tx=${transaction}`);

    expect(callback.headers['location']).toBe('http://localhost:5180');
  });

  it('rejects a mismatched state', async () => {
    const start = await request(app).get('/api/auth/google');
    const transaction = cookieValue(setCookieHeaders(start), 'dsg_oauth_tx')!;

    const callback = await request(app)
      .get('/api/auth/google/callback?code=auth-code&state=forged')
      .set('Cookie', `dsg_oauth_tx=${transaction}`);

    expect(callback.status).toBe(302);
    expect(callback.headers['location']).toContain('error=oauth_failed');
  });

  it('rejects a callback with no transaction cookie', async () => {
    const callback = await request(app).get(
      '/api/auth/google/callback?code=auth-code&state=whatever',
    );

    expect(callback.headers['location']).toContain('error=oauth_failed');
  });

  it('surfaces a rejected Google exchange as a login error', async () => {
    const start = await request(app).get('/api/auth/google');
    const transaction = cookieValue(setCookieHeaders(start), 'dsg_oauth_tx')!;
    const state = new URL(start.headers['location']!).searchParams.get('state')!;

    vi.spyOn(googleOAuth, 'exchangeCode').mockRejectedValue(
      new (await import('../../../lib/http-error.js')).HttpError(
        401,
        'oauth_failed',
        'Google account email is not verified',
      ),
    );

    const callback = await request(app)
      .get(`/api/auth/google/callback?code=auth-code&state=${encodeURIComponent(state)}`)
      .set('Cookie', `dsg_oauth_tx=${transaction}`);

    expect(callback.headers['location']).toContain('error=oauth_failed');
  });

  it('reuses the account on a second login with the same Google subject', async () => {
    await login();
    await login({ ...PROFILE, name: 'Ada L.', email: 'ada.new@example.com' });

    const rows = await db.select().from(refreshTokens);
    const userIds = new Set(rows.map((row) => row.userId));

    // Same account, updated profile — not a duplicate user.
    expect(userIds.size).toBe(1);
  });
});

describe('POST /api/auth/refresh', () => {
  it('returns a usable access token', async () => {
    const refreshToken = await login();

    const session = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `dsg_refresh=${refreshToken}`);

    expect(session.status).toBe(200);
    expect(session.body.expiresIn).toBe(15 * 60);

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${session.body.accessToken}`);

    expect(me.status).toBe(200);
    expect(me.body.email).toBe(PROFILE.email);
  });

  it('rotates: the presented token stops working and its replacement works', async () => {
    const first = await login();

    const rotated = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `dsg_refresh=${first}`);
    const second = cookieValue(setCookieHeaders(rotated), 'dsg_refresh')!;

    expect(second).not.toBe(first);

    expect(
      (await request(app).post('/api/auth/refresh').set('Cookie', `dsg_refresh=${second}`)).status,
    ).toBe(200);
  });

  it('revokes the entire family when a used token is presented again', async () => {
    const first = await login();

    const rotated = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `dsg_refresh=${first}`);
    const second = cookieValue(setCookieHeaders(rotated), 'dsg_refresh')!;

    // Replaying the old token is the signal that the plaintext leaked.
    const replay = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `dsg_refresh=${first}`);

    expect(replay.status).toBe(401);

    // The legitimate client's current token is killed too — both sides must log in again.
    const afterBreach = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `dsg_refresh=${second}`);

    expect(afterBreach.status).toBe(401);

    const remaining = await db.select().from(refreshTokens);
    expect(remaining.every((row) => row.revokedAt !== null)).toBe(true);
  });

  it('leaves other login sessions alone when one family is revoked', async () => {
    const sessionA = await login();
    const sessionB = await login();

    const rotatedA = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `dsg_refresh=${sessionA}`);
    expect(rotatedA.status).toBe(200);

    // Trigger reuse detection on family A only.
    await request(app).post('/api/auth/refresh').set('Cookie', `dsg_refresh=${sessionA}`);

    const stillValidB = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `dsg_refresh=${sessionB}`);

    expect(stillValidB.status).toBe(200);
  });

  it('rejects an unknown token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', 'dsg_refresh=made-up-token');

    expect(response.status).toBe(401);
  });

  it('rejects a request with no cookie', async () => {
    expect((await request(app).post('/api/auth/refresh')).status).toBe(401);
  });

  it('rejects an expired token and clears the cookie', async () => {
    const refreshToken = await login();

    await db
      .update(refreshTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(refreshTokens.tokenHash, hashRefreshToken(refreshToken)));

    const response = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', `dsg_refresh=${refreshToken}`);

    expect(response.status).toBe(401);
    expect(setCookieHeaders(response).some((entry) => entry.startsWith('dsg_refresh=;'))).toBe(
      true,
    );
  });

  it('stores only a hash of the token, never the plaintext', async () => {
    const refreshToken = await login();
    const rows = await db.select().from(refreshTokens);

    expect(rows).toHaveLength(1);
    expect(rows[0]!.tokenHash).not.toBe(refreshToken);
    expect(rows[0]!.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('POST /api/auth/logout', () => {
  it('revokes the session and clears the cookie', async () => {
    const refreshToken = await login();

    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', `dsg_refresh=${refreshToken}`);

    expect(response.status).toBe(204);
    expect(
      (await request(app).post('/api/auth/refresh').set('Cookie', `dsg_refresh=${refreshToken}`))
        .status,
    ).toBe(401);
  });

  it('is idempotent for an unknown token', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', 'dsg_refresh=made-up');

    expect(response.status).toBe(204);
  });
});

describe('GET /api/auth/me', () => {
  it('requires authentication', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });
});

describe('POST /api/auth/test-login', () => {
  it('is not mounted unless AUTH_TEST_LOGIN_ENABLED is set', async () => {
    const response = await request(app).post('/api/auth/test-login').send({});

    expect(response.status).toBe(404);
  });
});
