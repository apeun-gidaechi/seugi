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

The API listens on `http://localhost:8080`. Set `JWT_SECRET` in production. Development data is intentionally in memory; configure a durable repository before deployment.

For a persistent local deployment, copy `.env.example` to `.env`, set a real `JWT_SECRET`, then run `docker compose up --build`. The API persists state at `DATA_FILE` with atomic writes. This single-node adapter is suitable for local/small deployments; a shared SQL storage adapter is required before multi-instance production deployment.

## Migration coverage

The web client source is preserved under `apps/web`. API route compatibility is tracked in `docs/migration.md`; all server domains are represented by TypeScript contracts and API routes, with work continuing toward durable adapters and parity tests.
