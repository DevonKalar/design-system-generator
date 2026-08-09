# Design System Generator

React + Express monorepo for building design systems and exporting CSS tokens and a Tailwind
v4 setup.

## Commands

```bash
docker compose up -d     # Postgres on host port 5433
pnpm install
pnpm db:migrate          # apply migrations to the dev database
pnpm dev                 # web on :5180, API on :3000

pnpm test                # vitest across all packages (needs Postgres up)
pnpm test:e2e            # Playwright; starts its own servers
pnpm typecheck
pnpm lint                # oxlint — the baseline is zero warnings
pnpm format
```

`pnpm db:generate` after changing anything in `apps/api/src/db/schema/`.

Copy `.env.example` to `.env`. Google OAuth credentials are only needed for sign-in; see
[docs/auth.md](./docs/auth.md).

## Layout

| Path                 | Contents                                                          |
| -------------------- | ----------------------------------------------------------------- |
| `packages/contracts` | Zod schemas shared by both apps — the single source of validation |
| `packages/tokens`    | Token generation and emit. Pure, no I/O, no framework             |
| `apps/api`           | Express 5, Drizzle, Postgres                                      |
| `apps/web`           | React 19, Vite, Tailwind 4, React Router, TanStack Query          |
| `e2e`                | Playwright specs, driven by the root `playwright.config.ts`       |

Dependencies point one way: apps depend on packages, never the reverse. The workspace enforces
it — `@dsg/tokens` does not list any app as a dependency, so such an import would not resolve.

The internal packages export TypeScript source directly (no build step). Vite bundles them for
the web app and tsdown bundles them into the API's `dist/`; they must stay in `alwaysBundle`
there or the output would emit unresolvable bare `@dsg/*` imports.

## Docs

- [docs/api.md](./docs/api.md) — endpoint conventions, error shape, the owner-scoping invariant
- [docs/schema.md](./docs/schema.md) — the JSONB decision, schema versioning, migrations
- [docs/auth.md](./docs/auth.md) — OAuth flow, token model, rotation and reuse detection
- [docs/tokens.md](./docs/tokens.md) — generation algorithms and the emit contract

## Invariants worth not breaking

- **Repository functions take `ownerId`.** There is no unscoped read of an owned resource, so
  authorization cannot be forgotten. Other owners' resources return 404, not 403.
- **The database stores inputs, never derived tokens.** Ramps and scales are recomputed on
  read.
- **One emit function feeds both the preview and the zip.** They cannot be allowed to diverge.
- **Concurrent 401s must trigger one refresh.** Refresh tokens rotate and a replay revokes the
  whole session family, so a client firing parallel refreshes logs itself out.
- **`AUTH_TEST_LOGIN_ENABLED` bypasses authentication.** It stays flag-guarded and the server
  refuses to boot with it on in production.

## Conventions

- Tests live in `__tests__/` next to the code they cover.
- Config is validated at startup and throws on anything missing — no silent defaults for
  required values.
- The web app's own chrome uses stock Tailwind; generated tokens appear only inside the preview
  subtree as inline custom properties.
- Web dev port is 5180 with `strictPort`, not Vite's default 5173, which collides with other
  Vite apps. It is baked into `WEB_ORIGIN` and Google's redirect URI, so a silent port change
  would break sign-in.
