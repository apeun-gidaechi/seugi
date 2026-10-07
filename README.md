# Seugi TypeScript monorepo

This repository is the TypeScript migration of Seugi's web, server, Android, and iOS products.

| Package | Purpose |
| --- | --- |
| `apps/web` | Existing React/Vite desktop web client, retained and migrated into the workspace |
| `apps/api` | TypeScript Fastify API and Socket.IO real-time service |
| `packages/contracts` | Shared API route registry, domain schemas, and DTO types |
| `packages/api-client` | Shared typed HTTP client, token refresh, and domain operations |
| `packages/design-tokens` | Shared canonical Seugi colors and typography values |
| `apps/mobile` | React Native/Expo client (migration target for Android and iOS) |

## Shared API modules

`@seugi/contracts` is the source of truth for route paths, request validation, and Socket.IO event payloads. `src/api-spec.ts` is the stable barrel for the runtime-safe `API_SPEC`; route definitions and URL builders are split by domain under `src/api/`. Request schemas stay in modules such as `member.ts`, `workspace.ts`, `chat.ts`, and `school.ts`, while realtime events live in `realtime.ts`. Keeping runtime validators out of the route registry lets browser clients share paths without pulling validation code into their bundles.

`@seugi/api-client` consumes those routes and contracts. Web and mobile code should call its domain methods instead of assembling endpoint URLs or request payloads locally. The client owns JSON/multipart handling, bearer tokens, one-time refresh-and-retry behavior, and typed HTTP errors (`SeugiApiError`). Keep response-envelope unwrapping in app adapters where a screen still relies on a legacy view model.

Run `pnpm check` for TypeScript checks across every workspace, `pnpm --filter @seugi/api test` for API and client integration tests, and `pnpm build` for all workspace production builds.

## Run

```sh
pnpm install
pnpm dev
```

With `pnpm dev`, the API listens on `http://localhost:8080` and Vite serves the web client at `http://localhost:5173` (Vite may choose the next free port if that one is occupied). Without `DATABASE_URL`, the API uses an atomic file-backed store at `DATA_FILE`. To run the web, API, and shared PostgreSQL-backed setup locally, copy `.env.example` to `.env`, set a strong `JWT_SECRET` and `POSTGRES_PASSWORD`, then run `docker compose up --build`; Compose serves the web client at `http://localhost:3000`.

When `DATABASE_URL` is configured, the API imports the legacy `DATA_FILE` snapshot on first startup (if present) and persists to PostgreSQL. The current adapter uses one JSONB snapshot row with a transaction-scoped advisory lock, which makes API replicas share consistent state but serializes request writes; move hot domains to normalized tables before high-throughput production use. Uploaded files remain on the shared `/data` volume unless S3-compatible storage is configured.

## Migration coverage

The web client source is preserved under `apps/web`. API route compatibility is tracked in `docs/migration.md`; all server domains are represented by TypeScript contracts and API routes, with work continuing toward durable adapters and parity tests.
