import { createHash, randomBytes } from 'node:crypto';
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env.js';
import { HttpError } from '../../lib/http-error.js';

export interface GoogleProfile {
  googleSub: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface OAuthTransaction {
  state: string;
  codeVerifier: string;
}

const client = new OAuth2Client({
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  redirectUri: env.GOOGLE_REDIRECT_URI,
});

function base64url(buffer: Buffer): string {
  return buffer.toString('base64url');
}

/**
 * PKCE: the verifier stays in an httpOnly cookie and only its SHA-256 hash goes to Google, so
 * an intercepted authorization code cannot be redeemed without the original browser's cookie.
 */
export function createTransaction(): OAuthTransaction {
  return {
    state: base64url(randomBytes(32)),
    codeVerifier: base64url(randomBytes(32)),
  };
}

/**
 * Grouped into one object so tests can stub the network calls without mocking the whole
 * google-auth-library module.
 */
export const googleOAuth = {
  buildAuthUrl(transaction: OAuthTransaction): string {
    const codeChallenge = base64url(createHash('sha256').update(transaction.codeVerifier).digest());

    return client.generateAuthUrl({
      // We only ever read the profile at login, so there is no refresh token to store.
      access_type: 'online',
      scope: ['openid', 'email', 'profile'],
      state: transaction.state,
      code_challenge_method: CodeChallengeMethod.S256,
      code_challenge: codeChallenge,
      prompt: 'select_account',
    });
  },

  async exchangeCode(code: string, codeVerifier: string): Promise<GoogleProfile> {
    const { tokens } = await client.getToken({ code, codeVerifier });

    if (!tokens.id_token) {
      throw new HttpError(401, 'oauth_failed', 'Google did not return an identity token');
    }

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new HttpError(
        401,
        'oauth_failed',
        'Google identity token is missing a subject or email',
      );
    }

    // An unverified address could belong to someone else, which would let an attacker
    // register it and inherit the account on a future email-based lookup.
    if (payload.email_verified === false) {
      throw new HttpError(401, 'oauth_failed', 'Google account email is not verified');
    }

    return {
      googleSub: payload.sub,
      email: payload.email,
      name: payload.name ?? null,
      avatarUrl: payload.picture ?? null,
    };
  },
};
