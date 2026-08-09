# API

Conventions and invariants for the Express app in `apps/api`. Route lists live in the
`modules/*/routes.ts` files; this describes the rules they all follow.

## Shape

Everything is under `/api`, JSON in and out. Resources are returned bare — a `GET` of a
collection returns an array, not an envelope. Only failures are wrapped.

Request bodies and path parameters are parsed with schemas from `@dsg/contracts` via
`parseOrThrow`, inside the handler rather than as middleware, so the parsed value carries its
inferred type. Express 5 forwards errors thrown from async handlers, so there is no
`asyncHandler` wrapper and no `try`/`catch` in routes.

## Errors

Every non-2xx response has one shape, produced by the single handler in
`middleware/error-handler.ts`:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request body is invalid",
    "details": [{ "path": "name", "message": "Too small: expected string to have >=1 characters" }]
  }
}
```

`details` is populated for `validation_error` only. Codes are the `ERROR_CODES` union in
`@dsg/contracts`; adding one means adding it there first, so the client can narrow on it.

Anything thrown that is not an `HttpError` becomes a generic 500 with the real error logged
server-side — internal messages are never returned to the client. A Postgres unique violation
(`23505`) is translated to 409, because losing a race for a slug is a conflict, not a fault.

Unknown routes get the same body as everything else rather than Express's HTML 404.

## Authorization

**Every design-system repository function takes `ownerId` as a required argument.** There is
deliberately no `findById(id)` — an unscoped read is not expressible, so it cannot be
forgotten under time pressure. New queries against owned resources must follow this; if a
function needs to exist without an owner (an admin path, a background job), it belongs in a
separate module with a name that says so.

Requests for another owner's resource return **404, not 403**. A 403 would confirm the id
exists, which is a membership oracle over a private resource.

`requireAuth` is mounted on the router, not per-route, so a new endpoint is protected by
default. Read the identity through `authenticatedUserId(req)`, which throws if the route was
mounted without `requireAuth`, rather than reaching into `req.auth` and silently querying with
`undefined`.

## Auth endpoints

Documented in [auth.md](./auth.md) — token lifetimes, rotation, and the reuse-detection rule.

## Non-JSON responses

`GET /api/design-systems/:id/export.zip` streams an archive. Once headers are sent a failure
cannot be turned into a JSON error, so the handler destroys the connection instead of
appending garbage to a partial zip; the error handler re-delegates to Express when
`headersSent` is true.

Because it needs the `Authorization` header, the browser cannot download it via a plain link
navigation. The client fetches it and hands the blob to the browser as an object URL
(`downloadFile` in `apps/web/src/lib/api-client.ts`).

## CORS

There is none, on purpose. The Vite dev server proxies `/api` to the API, so the browser only
ever sees one origin and the refresh cookie needs no `SameSite` exceptions. Serving the web
app and API from different origins in production would require adding an explicit
single-origin allowlist plus `Access-Control-Allow-Credentials`.

## Configuration

`config/env.ts` validates the whole environment with Zod at import time and throws on anything
missing or malformed, so a misconfigured deploy fails at boot rather than on first request.
`.env` is a defaults layer: variables already set in the environment win.
