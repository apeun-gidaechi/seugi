# Source migration map

The original repositories were imported for analysis only and are excluded from the git worktree (`.upstream/`). This document maps their capabilities to the TypeScript monorepo implementation.

| Original source | TypeScript target | Status |
| --- | --- | --- |
| `seugi-desktop` React/Vite | `apps/web` | Source migrated intact; API base URL should be configured for the local API |
| `seugi-server` Kotlin/Spring | `apps/api` | HTTP domain routes and Socket.IO message delivery implemented; durable provider adapters remain required for production |
| `seugi-android` Kotlin/Compose | `apps/mobile` | Expo/React Native migration baseline: authentication, workspace selection, home, task/timetable, chat list, notices, profile |
| `seugi-ios` SwiftUI | `apps/mobile` | Same shared Expo/React Native client; platform app identifiers are configured |

## HTTP compatibility inventory

Implemented routes currently cover `/member`, `/workspace`, `/profile`, `/chat/group`, `/chat/personal`, `/chat/group/member`, `/message`, `/notification`, `/timetable`, `/task`, `/meal`, `/schedule`, `/email`, `/oauth`, `/ai`, and `/file`.

The original server also relies on MySQL, MongoDB, Redis, RabbitMQ, S3, Firebase Cloud Messaging, Google Classroom, NEIS, and OpenAI. The TypeScript API now has credential-gated adapters for Google Classroom, NEIS, SMTP email, OAuth, and the OpenAI Responses API (with `store: false` for Catseugi prompts). Firebase and production shared persistence still require deployment credentials and provider decisions. `apps/api` now supplies an atomic file-backed store for durable single-node use, but a relational/shared adapter is required before multi-instance production deployment.
