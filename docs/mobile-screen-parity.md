# Mobile screen parity audit

The native projects have separate route destinations, while the TypeScript mobile app intentionally combines some destinations into step-based screens. A mapped target means a corresponding UI path exists; it does **not** mean that visual and device behavior parity has been verified. Rows marked `device QA pending` still need comparison on Android and iOS.

## Android main navigation

| Original destination | TypeScript mobile target | Status |
| --- | --- | --- |
| Home | `HomeScreen` in `HomeScreen.tsx` | device QA pending |
| Chat | `ChatScreen` (`roomType="personal"`) | device QA pending |
| Group rooms | `ChatScreen` (`roomType="group"`) | device QA pending |
| Chat detail | `ChatConversationScreen` | device QA pending |
| Create room, member step | `CreateRoomScreen` | device QA pending |
| Create room, name step | `CreateRoomScreen` internal step | device QA pending |
| Profile | `ProfileScreen` | device QA pending |
| Account settings | `AccountSettingsScreen` | profile identity editing restored; device QA pending |
| Notices | `NoticesScreen` | device QA pending |
| Create notice | `NoticeEditorScreen` without initial notice | device QA pending |
| Edit notice | `NoticeEditorScreen` with initial notice | device QA pending |
| CatSeugi | `CatSeugiScreen` | device QA pending |
| Workspace detail | `WorkspaceDetailScreen` | device QA pending |
| Workspace members | `WorkspaceMembersScreen` | device QA pending |
| Workspace invitation | `WorkspaceInviteScreen` | device QA pending |
| Workspace notification settings | `WorkspaceNotificationsScreen` | device QA pending |
| Workspace general settings | `WorkspaceGeneralScreen` | device QA pending |
| Create workspace | `WorkspaceCreateScreen` | device QA pending |
| Join workspace / role / code / confirmation | `WorkspaceJoinScreen` steps | device QA pending |
| Waiting for workspace approval | `WorkspaceJoinScreen` / `WorkspaceSetupScreen` waiting state | device QA pending |
| Meal calendar | `MealCalendar` in `HomeScreen.tsx` | device QA pending |
| Timetable | `TimetablePage` in `HomeScreen.tsx` | device QA pending |
| Assignments | `AssignmentsScreen` | device QA pending |
| Create assignment | `TaskCreateScreen` | device QA pending |
| Email/social onboarding | `AuthScreen` states and provider actions | Google is currently hidden without client-ID configuration; device QA pending |

## iOS-only navigation differences

| Original destination | TypeScript mobile target | Status |
| --- | --- | --- |
| Profile settings (photo/name, account actions) | `AccountSettingsScreen` | profile identity editing restored; device QA pending |
| Group-chat second step | `CreateRoomScreen` internal step | device QA pending |
| Image preview | `ZoomableImage` in `ChatConversationScreen` | pinch zoom and save/share implemented; device QA pending |

## Screen inventory and audit limits

- The current mobile app has 11 screen source files and 22 exported screen-level components: auth, workspace setup, home, meals, timetable, assignments/create assignment, CatSeugi, personal/group chat, conversation, room creation, notices/create-edit notice, profile/account settings, and workspace detail/general/members/invites/notifications/create/join. Several onboarding, workspace-join, and room-create screens are multi-step flows inside one component. File count alone understates the UI surface; component count alone does not prove behavioral parity.
- Route presence is source-level evidence only. It does not prove matching layout, text, state transitions, permissions, system back behavior, or parity on real devices.
- An iOS simulator smoke pass signed in with a disposable local account and opened home, notice list/editor, personal/group chat lists, profile/account settings, workspace detail/members/invites/notifications, assignments, timetable/editor, and meal calendar. This verified screen reachability with an empty local workspace, not source-vs-target visual or interaction parity. The test account was signed out and its temporary API data removed afterward.
- Google sign-in was absent because `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is not configured; Apple, Google, realtime chat, and populated-school data still need credential-backed runtime checks. Push-token registration also remains unavailable without `EXPO_PUBLIC_EAS_PROJECT_ID`; the missing optional push configuration is logged without showing a global app error.
- The meal calendar route opened, but the local API returned `NEIS_API_KEY is not configured`; real meal/timetable-backed content could not be verified.
- Android device QA and source-vs-target capture/comparison remain outstanding. Update individual `device QA pending` rows only after those comparisons.
- The next parity pass should capture each source and TypeScript screen on Android and iOS, compare the interaction path, and update these statuses only after runtime verification.

## Design-system conversion status

The native screen map above is not evidence that the UI layer is fully converted. The original Android design system contains reusable implementations for buttons, top bars, text fields, navigation, chat items/lists, avatars, dialogs, pickers, toggles, badges, loading/error states, and related modifiers. The iOS `Component` project has corresponding reusable controls plus iconography, gradients, shadows, typography, and modal/navigation helpers. Together these source trees contain over 100 component/foundation files.

The TypeScript mobile target currently has shared color and font tokens in `packages/design-tokens`, a small app-local `components/ui.tsx` (button, card, workspace role picker), and a few specialized components. Most screen controls are still styled inline in screen files; there is no converted Seugi mobile component library yet. This is a real conversion gap, not merely a screen-file counting issue.

| Priority | Original reusable UI | Current TypeScript state | Remaining work |
| --- | --- | --- | --- |
| P0 | Button variants/sizes/loading/press states | Basic primary/secondary button | Port variants, dimensions, disabled/loading and interaction states; migrate screen usage |
| P0 | Top bar, bottom navigation, scaffold/safe-area patterns | Header and tab bar are embedded in `AuthenticatedAppShell` | Extract reusable primitives and match Android/iOS behavior separately where needed |
| P0 | Text fields, password/code/chat inputs | Mostly inline `TextInput` styles | Port field variants, validation/error and accessory behavior |
| P1 | Avatar, image, room image, member/chat list rows | Ad hoc per-screen rendering | Create reusable components and replace duplicated screen markup |
| P1 | Dialogs, sheets, dropdowns, segmented controls, toggles | Several native modals and inline choices | Match original variants and interaction semantics |
| P2 | Badges, tooltips, shadows/gradients, shimmer/loading/error states | Partial local styling | Port where used by original screens and verify on both platforms |

Until this component inventory is implemented and screen captures are compared, mobile UI conversion remains incomplete even where the destination has a TypeScript target.
