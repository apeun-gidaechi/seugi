# Source migration map

The original repositories were imported for analysis only and are excluded from the git worktree (`.upstream/`). This document maps their capabilities to the TypeScript monorepo implementation.

| Original source | TypeScript target | Status |
| --- | --- | --- |
| `seugi-desktop` React/Vite | `apps/web` | Source migrated intact; API base URL should be configured for the local API |
| `seugi-server` Kotlin/Spring | `apps/api` | HTTP domain routes, Socket.IO, provider adapters, file persistence, and shared PostgreSQL snapshot persistence implemented |
| `seugi-android` Kotlin/Compose | `apps/mobile` | Expo/React Native client implementing the feature set described in `docs/mobile-screen-parity.md`; **migration incomplete** until Android device QA in `docs/mobile-device-qa.md` is signed off |
| `seugi-ios` SwiftUI | `apps/mobile` | Same shared Expo client; **migration incomplete** until iOS device QA in `docs/mobile-device-qa.md` is signed off (includes OAuth, widgets, signing) |

Android home widgets use the authenticated session and selected workspace already stored by the mobile app. The meal widget selects breakfast/lunch/dinner by local time; the timetable widget shows today's periods. They refresh when the session/workspace changes and on Android's 30-minute widget update cycle. The original Android schedule requested 15-minute updates, below Android's supported periodic widget-update minimum. iOS home widgets now share meal and timetable snapshots through an App Group; credentials stay in SecureStore, snapshots refresh when the app session/workspace changes, and WidgetKit controls subsequent timeline refreshes. Device installs still require the app's real Apple development team and App Group capability provisioning.

## HTTP compatibility inventory

Implemented routes currently cover `/member`, `/workspace`, `/profile`, `/chat/group`, `/chat/personal`, `/chat/group/member`, `/message`, `/notification`, `/timetable`, `/task`, `/meal`, `/schedule`, `/email`, `/oauth`, `/ai`, and `/file`.

### HTTP route parity audit

An audit of the original Kotlin `@RequestMapping` and method annotations found 69 unique HTTP method/path templates. Each is covered by a shared TypeScript `API_SPEC` route after normalizing path-variable names and treating the original Google/Apple OAuth paths as instances of the TypeScript provider route. No original HTTP route template was left uncovered. `apps/api/test/api-contract.test.ts` separately verifies that every shared `API_SPEC` entry is registered by Fastify. This is route-existence evidence only; it does not establish matching request/response fields, authorization, error codes, or side effects, which still require endpoint-level contract and behavior tests.

### Realtime chat contract audit

The shared `chat.ts` module now owns both the normalized/legacy `Room` and `ChatMessage` DTOs and runtime validation for Socket.IO messages and the original STOMP message shape. The STOMP schema retains the native `uuid`, `eventList`, `emoticon`, mention, and mention-all fields while sharing room, text, and file validation with the Socket.IO path. `apps/api/test/chat-message.test.ts` covers whitespace-only text, attachment-only messages, invalid file entries, and preservation of the legacy metadata fields. These contract tests do not replace authenticated Android/iOS STOMP device testing.

Timetable payloads preserve the source API's `workspaceId`, `grade`, `classNum`, `time`, `subject`, and `date` fields; weekly/daily NEIS rows are filtered against the authenticated member's saved grade and class, and teacher/admin edits use the original create/update/delete routes.

Workspace HTTP responses include both the normalized TypeScript fields and the original `workspaceId`, `workspaceName`, `workspaceImageUrl`, and role-member fields. Creation/update also accept the original workspace field names, and file uploads accept the legacy `IMG`/`EMOJI` types as well as the mobile client's `IMAGE`/`PROFILE` names. Member and profile responses expose both flat TypeScript data and the original nested `member`/`permission`/`schGrade` fields; admin actions accept the desktop's `workspaceRole`, `memberList`, and targeted student-number payloads. Logout accepts both `fcmToken` and `deviceToken` so it can revoke the legacy web client's push registration. This keeps the retained desktop client and native clients on the same API during migration.

Task creation accepts both ISO datetimes with an offset and Android's original timezone-free `LocalDateTime` JSON representation (six fractional digits); the API preserves the submitted value so the native date and due-date ordering semantics are not shifted by parsing.

The original server also relies on MySQL, MongoDB, Redis, RabbitMQ, S3, Firebase Cloud Messaging, Google Classroom, NEIS, and OpenAI. The TypeScript API has credential-gated adapters for S3-compatible object storage, Firebase Cloud Messaging, Google Classroom, NEIS, SMTP email, OAuth, and the OpenAI Responses API (with `store: false` for Catseugi prompts). Omit `S3_BUCKET` to use local uploads, or configure the bucket and its IAM credentials for object storage. Clients register direct FCM or Expo device tokens through `POST /member/device-token`; the Expo mobile app requests notification permission after sign-in. Chat, announcements, and workspace-approval events fan out to registered devices, using Firebase service credentials for direct FCM tokens and Expo's push gateway for Expo tokens. Persistence supports atomic JSON files and an optional PostgreSQL-backed shared JSONB snapshot. The PostgreSQL adapter refreshes and commits under a transaction-scoped advisory lock on HTTP requests and socket writes; this is cross-instance consistent but serializes traffic and is a migration bridge, not a normalized high-throughput schema. See `README.md` for Compose setup.
