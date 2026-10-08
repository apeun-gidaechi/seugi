# Mobile device QA checklist

Use this while closing `device QA pending` rows in `mobile-screen-parity.md`. Each item needs **both** Android and iOS unless the native source is platform-specific.

## How to record evidence

For each screen: note device/simulator model, OS version, app build (commit hash), workspace fixture (empty vs seeded), and attach screenshots or a short screen recording. Link PR or issue when a row is updated.

## Automated verification (run before device sessions)

These do **not** replace on-device QA; they catch regressions in native rules already encoded in TypeScript.

| Command | Scope |
| --- | --- |
| `pnpm check` | TypeScript across all workspaces |
| `pnpm -r test` | API contract/integration (79+), mobile unit tests (105+), web tests |
| `pnpm --filter @seugi/mobile build` | Mobile `tsc` + Expo export (Android/iOS bundles) |

| Checklist ID | Covered by (mobile `test/*.test.ts` unless noted) |
| --- | --- |
| H-01 meal carousel / Classroom / card data rules | `home.test.ts`, `home-screen-data.test.ts` |
| WG-01 Android meal widget period | `meal-widget-period.test.ts` (08:10 cutoffs; home card uses 08:20 in `home.test.ts`) |
| WG-02 iOS meal widget period | `ios-meal-widget-period.test.ts` (`MealType.from` rules; lunch from 09:00, dinner from 13:31) |
| C-01 / C-02 room search / ordering / timestamps | `chat.test.ts`, `chat-room-list.test.ts` |
| C-03 message search / list merge / unread | `chat.test.ts`, `chat-conversation.test.ts` |
| M-01 future-date dimming | `meal-calendar.test.ts` |
| T-01 week label | `date.test.ts` |
| A-01 assignments / task create | `assignments.test.ts`, `taskCalendar.test.ts` |
| AI-01 CatSeugi rendering | `apps/api/test/ai.test.ts`, `catseugi.test.ts` (`catseugiVisibleText`) |
| W-01 members search / profile | `workspace-member-search.test.ts`, `workspace-member-profile*.test.ts` |
| AU-01 auth CTAs / feedback | `auth-button.test.ts`, `auth-feedback.test.ts` |
| S-01 tab conversation state | `tab-navigation.test.ts` |

Record the commit hash from `pnpm -r test` in evidence notes when closing a row.

## Prerequisites

- Local API with required env (see repo `README.md`): at minimum a test workspace; for meal/timetable cards configure `NEIS_API_KEY` when validating NEIS-backed UI.
- Mobile: `EXPO_PUBLIC_*` for API URL; Google `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`; push `EXPO_PUBLIC_EAS_PROJECT_ID` when testing notifications.
- Compare against native builds from `.upstream/` analysis snapshots or installed legacy apps on the same workspace data where possible.

## Authenticated shell (all tabs)

| ID | Screen | Verify |
| --- | --- | --- |
| S-01 | Tab switch | Tab roots stay mounted; returning preserves list scroll and open chat per platform rules |
| S-02 | System back | Android back and iOS edge swipe pop the expected route (detail → tab, search mode → list) |
| S-03 | No-workspace mode | Five tabs, registration alert, 10s approval poll, platform-specific chat add targets |

## Main navigation (parity table)

| ID | Destination | Key checks |
| --- | --- | --- |
| H-01 | Home | Card order/spacing, meal carousel time rules, timetable empty/failure copy, assignment card platform empty states, pull-to-refresh |
| C-01 | Personal chat list | Avatar 36pt, search mode, ordering, unread badges, timestamps |
| C-02 | Group chat list | Member count on iOS only; search/filter rules |
| C-03 | Chat conversation | Composer, search, drawer, attachments, reactions, failed send retry, image preview |
| C-04 | Create room | Member step → name step state; invite (Android group) |
| P-01 | Profile / account settings | Field editors, photo picker, withdrawal flows |
| N-01 | Notices | Paging (Android) vs full list (iOS), emoji picker, create/edit/delete permissions |
| W-01 | Workspace detail / members / invite / notifications / general | Picker UI, toggles, member actions, join approvals |
| J-01 | Join flow | Role → code → confirm → waiting; approval screen copy |
| M-01 | Meal calendar | Grid, future-date dimming (Android), empty/failure |
| T-01 | Timetable | Week label range, loading replaces grid (iOS), shadows |
| A-01 | Assignments / task create | Sort order, badges, date picker validation and wire format |
| AI-01 | CatSeugi | Suggestion chips, structured answers, draw/team name resolution |
| AU-01 | Auth | Email + Google + Apple sheets; verification timers per platform |

## Widgets

| ID | Check |
| --- | --- |
| WG-01 | Android meal/timetable widgets refresh after login, workspace change, foreground |
| WG-02 | iOS App Group snapshot updates and WidgetKit timeline |

## Evidence log

Record device QA sessions here before updating `mobile-screen-parity.md` rows. Keep `device QA pending` until both platforms are captured.

| Date | Commit | Scope | Environment | Result | Artifacts |
| --- | --- | --- | --- | --- | --- |
| 2026-10-08 | `aed2a66` | Automated gate | local macOS | `pnpm check`, `pnpm -r test` green (API 79, mobile 103) | Terminal output; maps to checklist IDs in **Automated verification** above |
| | | H-01 … AU-01 | Android + iOS device/sim | Pending | Screenshots / recording per screen ID |

## Sign-off

Migration is **not** complete until:

1. Every parity-table row has evidence linked here or in the PR that updated the row.
2. P1/P2 design-system “Remaining work” in `mobile-screen-parity.md` is empty or explicitly deferred with owner.
3. `docs/migration.md` mobile row no longer says “device-level parity still requires verification” without a dated sign-off.
