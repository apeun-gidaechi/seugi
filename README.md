# Seugi TypeScript monorepo

This repository is the TypeScript migration of Seugi's web, server, Android, and iOS products.

| Package | Purpose |
| --- | --- |
| `apps/web` | Existing React/Vite desktop web client, retained and migrated into the workspace |
| `apps/api` | TypeScript Fastify API and Socket.IO real-time service |
| `packages/contracts` | Shared API domain types and response envelope |
| `apps/mobile` | React Native/Expo client (migration target for Android and iOS) |

## Run

```sh
pnpm install
pnpm dev
```

The API listens on `http://localhost:8080`; the web client is at `http://localhost:3000`. Without `DATABASE_URL`, the API uses an atomic file-backed store at `DATA_FILE`. To run the web, API, and shared PostgreSQL-backed setup locally, copy `.env.example` to `.env`, set a strong `JWT_SECRET` and `POSTGRES_PASSWORD`, then run `docker compose up --build`.

When `DATABASE_URL` is configured, the API imports the legacy `DATA_FILE` snapshot on first startup (if present) and persists to PostgreSQL. The current adapter uses one JSONB snapshot row with a transaction-scoped advisory lock, which makes API replicas share consistent state but serializes request writes; move hot domains to normalized tables before high-throughput production use. Uploaded files remain on the shared `/data` volume unless S3-compatible storage is configured.

## Migration coverage

The web client source is preserved under `apps/web`. API route compatibility is tracked in `docs/migration.md`; all server domains are represented by TypeScript contracts and API routes, with work continuing toward durable adapters and parity tests.
