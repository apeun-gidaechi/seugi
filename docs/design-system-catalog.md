# Design system catalog

Browse Seugi UI on **web** (tokens) and on **device** (React Native components).

## Web — Storybook

From the repo root:

```bash
pnpm install
pnpm --filter @seugi/storybook dev
```

Open [http://localhost:6006](http://localhost:6006).

| Sidebar               | Contents                                                                 |
| --------------------- | ------------------------------------------------------------------------ |
| **Design system**     | Color tokens, typography                                                 |
| **Web/Ui**            | Shared `Components/ui` primitives                                        |
| **Web/Components/**   | Auto stories — one per `apps/web/src/Components/**/*.tsx` default export |
| **Web/Pages/**        | Auto stories — one per `apps/web/src/Pages/**/*.tsx` default export      |
| **Mobile/Playground** | How to open the RN playground on device                                  |

`pnpm --filter @seugi/storybook sync-stories` regenerates web component stories after you add files under `apps/web/src/Components` (commit the output; CI builds the checked-in CSF files). Auto stories merge defaults from `stories/web/storybookComponentMocks.ts` so components render without the full app shell.

Storybook installs a **fetch mock** (`.storybook/installStorybookFetchMock.ts`) and a **socket shim** (`storybookSocketService.ts`, aliased over `socketService`) plus demo `workspaceId` / tokens so SWR, REST, and chat pages work offline. Chat page stories use `MemoryRouter` paths `/chat` and `/groupchat` (see `sync-page-stories.mjs`). `pnpm --filter @seugi/storybook check` also runs a production **build** as a compile/smoke gate.

Playground chat screens use an in-memory **socket stub** (`playgroundSocket.ts`) so `ChatConversationScreen` can send/receive messages without a chat server.

React Native design-system and screens: **Seugi Playground** on iOS/Android (Storybook does not bundle RN).

## iOS / Android — Playground dev client

The playground is a separate app variant (`EXPO_PUBLIC_APP_VARIANT=playground`) with bundle id `com.seugi.playground`. It skips widgets and strips push / Sign in with Apple entitlements so a wildcard development profile is enough on a physical device.

Regenerate native projects when switching between playground and production:

```bash
# Simulator
pnpm --filter @seugi/mobile ios:playground

# Physical device (USB, trusted, unlock the phone, Xcode signing)
export EXPO_IOS_TEAM_ID=B42SPPS3PR   # or your Apple team
pnpm --filter @seugi/mobile exec expo prebuild --platform ios --clean
pnpm --filter @seugi/mobile ios:playground:device
```

### Metro + Playground (two terminals)

Do **not** use `pnpm start` for Playground — that uses scheme `seugi` (main app). Use:

**Terminal 1 — bundler (leave running)**

```bash
pnpm --filter @seugi/mobile start:playground
```

Prints your Mac LAN URL (`http://<ip>:8081`). Phone and Mac must be on the **same Wi‑Fi**.

**Terminal 2 — install/launch native app (once per native change)**

```bash
export EXPO_IOS_TEAM_ID=B42SPPS3PR
pnpm --filter @seugi/mobile ios:playground:device
```

`--no-bundler` is default so it does not fight Terminal 1 on port 8081.

**On the phone**

- Seeing the **Expo Dev Launcher** (development servers list) is normal if you only tapped the app icon before Metro was linked. Either:
  - **Scan the QR code** shown in Terminal 1 with the **Camera** app (opens **Seugi Playground**, not Expo Go), or
  - On the launcher, tap **`http://<your-mac-ip>:8081`**, or
  - Shake → **Configure Bundler** → URL from Terminal 1 → Reload.
- After **`ios:playground:device`** once (writes your Mac LAN IP into the native build), opening the app icon can load Playground directly on the same Wi‑Fi.
- Do **not** use the **Expo Go** app from the App Store for this repo.

The playground JS entry is selected by bundle id `com.seugi.playground` even if Metro env vars differ.

### Playground structure

After launch, the playground home lists:

1. **Design system** — list in `designSystemDemos` (one focused demo per `src/design-system/*.tsx`, plus **Full catalog** scroll)
2. **Screens** — searchable list of screen demos (`src/screens/*`, auth flows, shells)
3. **Components** — shared `src/components/*` demos

The playground variant wires `PlaygroundSeugiApi` (in-memory fixtures) so Home, Chat, Notices, Assignments, and most workspace screens render with sample data. Chat uses `playgroundSocket.ts` (in-memory ack + messages, no chat server).

`pnpm --filter @seugi/mobile test` runs coverage scripts so playground stays complete:

- `check-playground-screen-coverage.mjs` — every `src/screens/**/*Screen.tsx` in `screenDemos`
- `check-playground-design-system-coverage.mjs` — every `src/design-system/*.tsx` in `designSystemDemos` and `DesignSystemCatalogScreen`
- `check-playground-component-coverage.mjs` — every `src/components/*.tsx` in `componentDemos`

`pnpm --filter @seugi/storybook check` verifies auto stories for each web `Components` and `Pages` default export, runs a production **build**, checks `storybook-static/index.json`, then runs **Playwright test-runner** smoke against every story (`test:smoke` after a build). Global `StoryProviders` supplies `SelectedProvider`, Google OAuth, fetch/socket mocks, and a single `MemoryRouter` (per-story routes via `parameters.router.initialEntries`).

## Production app on a physical iPhone

```bash
export EXPO_IOS_TEAM_ID=B42SPPS3PR
pnpm --filter @seugi/mobile ios:device
```

Configure API URLs and OAuth in `apps/mobile/.env` (see `.env.example`).
