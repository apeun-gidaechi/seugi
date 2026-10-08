# Tooling and conventions

## Stack (current)

| Layer       | Choice                            | Notes                                                         |
| ----------- | --------------------------------- | ------------------------------------------------------------- |
| Monorepo    | pnpm workspaces                   | `apps/*`, `packages/*`                                        |
| Language    | TypeScript 5.7+, `strict`         | Shared `tsconfig.base.json`                                   |
| API         | Fastify 5, Zod, Socket.IO         | Routes under `apps/api/src/routes/`                           |
| Mobile      | Expo 52 / React Native 0.76       | Single client for Android + iOS                               |
| Web         | Vite 4 + React 18                 | Legacy desktop UI; gradual alignment with `@seugi/api-client` |
| Contracts   | `@seugi/contracts`                | Routes + runtime schemas                                      |
| Persistence | File snapshot or PostgreSQL JSONB | Normalized DB is a future scaling step, not a lint concern    |

## Formatting and lint

From the repo root:

| Command             | Purpose                                                         |
| ------------------- | --------------------------------------------------------------- |
| `pnpm format`       | Prettier write (TS/TSX/JSON/MD/YAML)                            |
| `pnpm format:check` | CI-style Prettier check                                         |
| `pnpm lint`         | ESLint on API, mobile, and shared packages (required in CI)     |
| `pnpm lint:web`     | ESLint on legacy web (incremental cleanup; not in `verify` yet) |
| `pnpm lint:fix`     | ESLint auto-fix on API, mobile, and packages                    |
| `pnpm check`        | `tsc --noEmit` in every package                                 |
| `pnpm test`         | Package test scripts                                            |
| `pnpm verify`       | `check` + `lint` + `format:check` + `test`                      |

Prettier owns formatting; ESLint owns correctness and React hooks rules. Do not fight Prettier with ESLint stylistic rules (`eslint-config-prettier` disables overlaps).

## Code conventions

- **Imports:** Prefer workspace packages (`@seugi/contracts`, `@seugi/api-client`) over duplicating URLs or DTOs in apps.
- **API routes:** Register in `registerRoutes.ts` / `routes/*`; keep `app.ts` as bootstrap only.
- **Mobile platform branches:** Prefer `nativePlatform()` and small tested helpers (`shellNavigation`, `noWorkspaceShell`, `homeScreenData`) over scattered `Platform.OS` ternaries.
- **Tests:** Node native test runner; name files `*.test.ts` beside or under `test/`.
- **Commits:** Task-scoped; run `pnpm verify` before opening a PR.

## Tech stack review (direction)

Short term, keep Fastify + Expo + shared contracts. Revisit deliberately when:

1. **Postgres** — move hot paths off the JSONB snapshot (chat, notifications) if write contention appears.
2. **Web** — reduce styled-components surface in favor of shared tokens + simpler layout primitives when touching screens.
3. **Mobile lint** — optional `eslint-plugin-react-native` if a11y/layout rules become a recurring QA issue.

Until device QA sign-off (`docs/mobile-device-qa.md`), avoid drive-by UI rewrites; tooling and refactors should preserve parity behavior covered by tests.
