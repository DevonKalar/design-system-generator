# Authentication

Google OAuth 2.0 with an access/refresh token pair. Code is in
`apps/api/src/modules/auth/`; the client half is `apps/web/src/lib/api-client.ts` and
`features/auth/`.

## Google setup

You need an OAuth client before sign-in works. Everything else in the app runs without one.

1. Google Cloud Console → **APIs & Services → Credentials**.
2. Configure the **OAuth consent screen** (External is fine for testing; add yourself as a
   test user).
3. **Create Credentials → OAuth client ID → Web application**.
4. Under **Authorized redirect URIs** add exactly:
   `http://localhost:3000/api/auth/google/callback`
5. Copy the client ID and secret into `.env` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

The redirect URI must match `GOOGLE_REDIRECT_URI` character for character — Google rejects
anything else, including a trailing slash difference.

## The flow

1. `GET /api/auth/google` generates a random `state` and a PKCE `code_verifier`, stores both in
   a short-lived httpOnly cookie, and redirects to Google with the verifier's SHA-256 hash.
2. Google redirects back to `GET /api/auth/google/callback`. The handler compares `state`
   against the cookie in constant time, exchanges the code (sending the verifier), verifies the
   returned `id_token`, and upserts the user on `google_sub`.
3. It sets the refresh cookie and redirects to the web app — **the access token is not in the
   URL**, because it would land in browser history and in the `Referer` header. The app calls
   `/api/auth/refresh` on load and gets one from the cookie.

PKCE matters even with a confidential client: it binds the authorization code to the browser
that started the flow, so an intercepted code cannot be redeemed elsewhere. An unverified
Google email is rejected — an attacker could otherwise register an address they do not own and
inherit the account.

A failed login redirects to `/login?error=…` rather than returning a JSON body, because this
is a browser navigation and a JSON error would strand the user on a blank page.

## Tokens

|             | Access                       | Refresh                                           |
| ----------- | ---------------------------- | ------------------------------------------------- |
| Format      | JWT, HS256                   | opaque random, 32 bytes                           |
| Lifetime    | 15 minutes                   | 30 days                                           |
| Stored      | in memory in the browser tab | httpOnly cookie, `SameSite=Lax`, `Path=/api/auth` |
| Server-side | nothing stored               | SHA-256 hash in `refresh_tokens`                  |

The access token is never written to `localStorage` or `sessionStorage`, where any injected
script could read it. Losing it on reload is intentional and costs one refresh call.

Only the refresh token's hash is stored, so a database leak does not hand over usable sessions.
It is scoped to `/api/auth` so it is not attached to ordinary API calls. `Secure` is set except
in development, where the cookie has to work over plain http.

## Rotation and reuse detection

Every refresh rotates: the presented token is revoked and a replacement is issued in the same
**family**, where a family is one login.

**If a token is presented after it has already been revoked, the entire family is revoked.**
The reasoning: the legitimate client always moves on to its replacement, so a second use of an
old token means the plaintext leaked. There is no way to tell the attacker's request from the
victim's, so both are logged out. That is the intended outcome — a forced re-login is cheaper
than a silently shared session.

Rotation claims the row with a conditional `UPDATE … WHERE revoked_at IS NULL`, so two
concurrent refreshes cannot both succeed; the loser is treated as reuse.

This puts a requirement on the client: **concurrent 401s must produce one refresh, not
several.** `refreshSession()` is single-flight for exactly this reason. A client that fires
parallel refreshes will trip reuse detection and log itself out.

Separate logins get separate families, so revoking one does not touch the others.

## The test-login seam

Google's consent screen cannot be driven from an automated test. `POST /api/auth/test-login`
mints a session with **no credential check** and is mounted only when
`AUTH_TEST_LOGIN_ENABLED=true`.

`config/env.ts` refuses to start the server if that flag is true while `NODE_ENV=production`.
It is off by default in `.env.example`; the Playwright config turns it on for its own run only,
by passing the variable in the environment (which beats the `.env` file).

It is a deliberate authentication bypass. Keep it flag-guarded, keep the production check, and
do not reach for it as a convenience in development.
