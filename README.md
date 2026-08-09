# DESIGN SYSTEM GENERATOR

A React app for generating design systems and exporting as CSS tokens + Tailwind v4 setups.

Define palettes, a type scale, spacing, radii and shadows in a visual editor; see a live
preview in light and dark; export `theme.css` for Tailwind v4 or plain custom properties for
anything else.

## Quick start

```bash
docker compose up -d          # Postgres on :5433
pnpm install
cp .env.example .env          # then set JWT_SECRET, and Google credentials to sign in
pnpm db:migrate
pnpm dev                      # http://localhost:5180
```

Sign-in needs a Google OAuth client — [docs/auth.md](./docs/auth.md) walks through creating
one.

## How it works

You edit **inputs** — a base color, a type ratio, a spacing unit. A pure TypeScript engine
(`packages/tokens`) expands those into an 11-step OKLCH ramp per palette, a type scale with
derived leading and tracking, and the rest. The same function produces the live preview in the
browser and the zip the server streams, so the download always matches what you saw.

Nothing derived is stored, so improving a generation algorithm improves every existing system.

## Stack

React 19 · Vite · Tailwind 4 · Express 5 · Drizzle · Postgres · Google OAuth with rotating
refresh tokens · Vitest · Playwright

See [CLAUDE.md](./CLAUDE.md) for commands, layout and the invariants worth preserving.
