# Database schema

Postgres via Drizzle. Table definitions are in `apps/api/src/db/schema/`; this covers the
decisions behind them.

## The design system document is JSONB

`design_systems.definition` holds the entire document as validated JSONB rather than being
normalised into `palettes` / `scale_steps` / `type_scale` tables.

Why: the editor always reads and writes the whole document, systems are owner-scoped so
nothing ever queries an individual token across systems, and the token categories change often
enough that a table per category would mean a migration per category.

What it costs: there is no way to ask SQL a question like "which systems use this hue". Adding
that would mean either normalising the colors or maintaining a generated index column — a real
migration, not a small change. Accept this constraint or change it deliberately.

Integrity is enforced at the application boundary instead of by the database:
`designSystemDefinitionSchema` rejects writes where a semantic token references a palette that
does not exist, which is the invariant a foreign key would otherwise give us.

## Stored inputs, derived outputs

The document stores **inputs only** — a base color, a type ratio, a spacing unit. The eleven
OKLCH values of a ramp are never written. `@dsg/tokens` recomputes everything on read.

This means improving a generation algorithm improves every existing system with no backfill,
and there is no such thing as derived data that has gone stale relative to its inputs. It also
means a change to the algorithms is a visible change to every user's output, which is the
tradeoff being made.

## Schema versioning

`design_systems.schema_version` records which definition shape a row holds. On read, the
service asserts it matches `CURRENT_SCHEMA_VERSION` from `@dsg/contracts` and throws
otherwise — a rollback reading documents written by a newer deploy fails loudly instead of
handing an unknown shape to the token engine and emitting a broken export.

Changing the definition shape means: bump `CURRENT_SCHEMA_VERSION`, add a forward migration
keyed on the old version, and call it from `assertReadableVersion` in
`modules/design-systems/service.ts`. That function is the single place this is handled.

## Identity and ownership

Users are keyed on `google_sub`, Google's stable subject identifier — not email. A Google
account's email can change, and matching on it would let a reassigned address inherit an
existing account.

Everything owned cascades from `users.id`, so deleting a user removes their systems and
sessions in one statement. Slugs are unique per owner, not globally: two people can both have
`acme`.

## Migrations

Generated, never hand-written:

```bash
pnpm db:generate   # diff schema/ against the last migration
pnpm db:migrate    # apply pending migrations
```

Migrations are checked in and are append-only — editing one that has been applied anywhere
means the file no longer describes the database it produced. `db/migrate.ts` is shared by the
CLI script and the integration suite's global setup, so tests exercise the same migration
files that ship.

## Databases

Three, all in the one container (`docker-compose.yml`):

| Database   | Used by                                                         |
| ---------- | --------------------------------------------------------------- |
| `dsg`      | the dev server                                                  |
| `dsg_test` | the vitest integration suite, which truncates between each test |
| `dsg_e2e`  | the Playwright run, which drives the real app                   |

They are separate so a test run can never truncate the data you were working with. Host port
is **5433**, not 5432, so this never collides with a system Postgres.
