# Mobile screen parity audit

The native projects have separate route destinations, while the TypeScript mobile app intentionally combines some destinations into step-based screens. A mapped target means a corresponding UI path exists; it does **not** mean that visual and device behavior parity has been verified. Rows marked `device QA pending` still need comparison on Android and iOS.

## Android main navigation

| Original destination | TypeScript mobile target | Status |
| --- | --- | --- |
| Home | `HomeScreen` in `HomeScreen.tsx` | Pull-to-refresh reloads the home data set; meal query is date-scoped; schedule query is current-month with Android's three-item cap and iOS's future-only rule; platform-specific schedule/meal failure states; populated meal/timetable/task and device capture parity pending |
| Chat | `ChatScreen` (`roomType="personal"`) | last-message ordering, avatars, timestamps, unread badges, and pull-to-refresh aligned to Android; device QA pending |
| Group rooms | `ChatScreen` (`roomType="group"`) | member counts plus shared chat-row parity aligned to Android; device QA pending |
| Chat detail | `ChatConversationScreen` | Own messages align right; incoming sender avatars/names, local-date dividers, Korean local timestamps, used-reaction-only display, and live unread counts are implemented; device QA pending |
| Create room, member step | `CreateRoomScreen` with removable selected-member chips, avatars, and native top-bar completion action | source layout/interactions restored; device QA pending |
| Create room, name step | `createGroupRoomName` destination using `CreateRoomScreen` with native top-bar back/completion actions | Standalone shell destination; selected members persist across stack transitions; device QA pending |
| Chat detail, member invite | `ChatInviteScreen` standalone screen component, entered from chat-room management and returned via its back action | Separated from the management screen's inline conditional view to mirror Android's `ChatDetailInviteScreen`; selected-member chips, workspace-member rows, completion action, and membership API flow are preserved. The chat-member panel now shows native-size avatars with name fallback from room membership data; device QA pending |
| Profile | `ProfileScreen` | iOS phone/wireless-number editors now use numeric keypad and native 11-character limit; Android input length remains unchanged; device QA pending |
| Account settings | `AccountSettingsScreen` | profile identity editing restored; device QA pending |
| Notices | `NoticesScreen` | device QA pending |
| Create notice | `NoticeEditorScreen` without initial notice | device QA pending |
| Edit notice | `NoticeEditorScreen` with initial notice | device QA pending |
| CatSeugi | `CatSeugiScreen` | Suggestion prompts now match platform originals (iOS “8월 행사 알려줘”, Android today’s timetable); Android keeps prompts visible while the user is typing; device QA pending |
| Workspace detail | `WorkspaceDetailScreen` | device QA pending |
| Workspace members | `WorkspaceMembersScreen` | Teacher/student segmented list, member avatars/admin marks, profile sheet, and start-personal-chat action now match native interaction structure; device QA pending |
| Workspace invitation / join requests | `WorkspaceInviteScreen` with role-filtered multi-select and bulk approve/reject actions | Batch request handling and selection-state clearing match the existing web/API contract; native avatar rows and confirmation prompts restored; device QA pending |
| Workspace notification settings | `WorkspaceNotificationsScreen` | Replaced generic settings card/button with the native single-row “전체 알림 허용” toggle layout; device QA pending |
| Workspace general settings | `WorkspaceGeneralScreen` | Android demo-mode failure alert and iOS confirmation-only alert now follow their platform sources; device QA pending |
| Create workspace | `WorkspaceCreateScreen` | device QA pending |
| Join workspace / role | `workspaceJoin` destination with shared illustrated `WorkspaceRoleSelection` | Standalone shell destination; device QA pending |
| Join workspace / invite code | `workspaceJoinCode` destination | Standalone shell destination; code search transitions to confirmation; device QA pending |
| Join workspace / confirmation | `workspaceJoinConfirm` destination with `WorkspaceJoinConfirmation` | Standalone shell destination; preserves selected role/code/workspace across back-stack transitions; device QA pending |
| Waiting for workspace approval | `workspaceJoinWaiting` destination with `WorkspaceApprovalScreen` shared by `WorkspaceSetupScreen` | Standalone shell destination; system/top-bar back returns to confirmation, completion clears nested routes and returns to Home; device QA pending |
| Meal calendar | `MealCalendar` in `HomeScreen.tsx` | device QA pending |
| Timetable | `TimetablePage` in `HomeScreen.tsx` | device QA pending |
| Assignments | `AssignmentsScreen` | Loading, empty, and retrieval-failure presentation now follows native platform behavior: Android keeps unresolved/failed sections hidden, iOS shows progress and “과제가 없어요”; failed requests clear stale rows; device QA pending |
| Create assignment | `TaskCreateScreen` with native title/date fields and top-bar create action | Past dates are disabled to match Android's date picker validation; source layout/action restored; device QA pending |
| Email/social onboarding | `AuthScreen` states and provider actions | iPad simulator verified the gradient/cloud start, sign-in option sheet and signup fields/code-entry transition; the email login route now mirrors native labels/footer but needs a fresh visual comparison. Code delivery/submission and Google remain unverified; Apple action is visible but credential flow unverified |

## iOS-only navigation differences

| Original destination | TypeScript mobile target | Status |
| --- | --- | --- |
| Profile settings (photo/name, account actions) | `AccountSettingsScreen` | profile identity editing restored; device QA pending |
| Group-chat second step | `CreateRoomScreen` internal step | device QA pending |
| Image preview | `ZoomableImage` in `ChatConversationScreen` | pinch zoom and save/share implemented; device QA pending |

## Screen inventory and audit limits

- The authenticated TypeScript shell currently wires 26 screen destinations: five bottom tabs, the chat conversation view, and 20 detail destinations in `AppDetail`. The iOS `MainDestination` enum has 21 cases, plus five tab roots; this is a comparable logical-destination count, not proof of parity. Android has 22 distinct route strings in the production main feature graph (its notification-create and notification-edit constants collide on the same string). Its 36 `*Screen.kt` files include nested content and helpers, so file counts must not be used as route counts.
- The mobile app currently has 14 files under `src/screens/`, compared with the logical destination counts above. This is the concrete reason the conversion can feel underscreened: many destinations are co-located in a few large files. The authenticated workspace join has four distinct shell destinations and group-chat naming has its own destination. Initial no-workspace setup has a seven-entry navigation stack for start/create/role/code/confirmation/waiting/request-list; auth now keeps start/login/signup/verification as explicit stack entries, including the signup-to-login path. System back pops the actual preceding route in both flows. These are not counted as independent authenticated shell destinations. Continue separating flows where the original exposes distinct screens and compare their UI/runtime behavior before calling conversion complete.
- The Android source has separate feature modules for onboarding, home, meal, timetable, assignment/create, personal/group chat and chat detail/invite, notices/create/edit, CatSeugi, profile/settings, room creation, and workspace setup/detail/member/invite/settings. The iOS source additionally separates image preview, profile settings, and several onboarding/join and notification flows. Some are represented only as nested state or modal content in TypeScript; route/component existence is only an initial coverage check. The remaining audit must trace each original navigation destination and label whether it is a standalone route, an embedded step, or absent, then add a distinct screen where collapsing changes the original structure or presentation.
- The Android production navigation declares 22 distinct route strings outside the `main` root; create/edit notification currently collide on one route string, so they are not distinct Android routes despite separate screen functions. The 36 `*Screen.kt` files include nested content and helper composables. Chat member invitation is a distinct TS screen component nested under chat detail. These paths still need destination-by-destination runtime comparison for stack and native back behavior.
- Route presence is source-level evidence only. It does not prove matching layout, text, state transitions, permissions, system back behavior, or parity on real devices.
- Group-room member invitations are available to every current room member in the Android source. The TypeScript UI and API now match that behavior while keeping member invitations limited to authenticated room members and workspace members; kick and leadership-transfer actions remain room-admin-only.
- An iOS simulator smoke pass signed in with a disposable local account and opened home, notice list/editor, personal/group chat lists, profile/account settings, workspace detail/members/invites/notifications, assignments, timetable/editor, and meal calendar. This verified screen reachability with an empty local workspace, not source-vs-target visual or interaction parity. The test account was signed out and its temporary API data removed afterward.
- A current iPad A16 simulator pass compared the email-registration layout and state transition to the native SwiftUI source. The form has labeled name/email/password/confirmation fields and a fixed continue action; continuing opens the code screen without sending mail, matching the native route sequence. Only dummy `.invalid` input was used and no email was sent. Code delivery and registration submission remain unverified.
- Google sign-in was absent because `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is not configured; Apple, Google, realtime chat, and populated-school data still need credential-backed runtime checks. Push-token registration also remains unavailable without `EXPO_PUBLIC_EAS_PROJECT_ID`; the missing optional push configuration is logged without showing a global app error.
- The meal calendar route opened, but the local API returned `NEIS_API_KEY is not configured`; real meal/timetable-backed content could not be verified.
- Native builds now pass for Android (`apps/mobile/android/gradlew assembleDebug`) and iOS Simulator (`xcodebuild -workspace apps/mobile/ios/Seugi.xcworkspace -scheme Seugi -sdk iphonesimulator -configuration Debug -destination 'generic/platform=iOS Simulator' ... build`). These prove native project compilation, not device interaction parity. Android device QA and source-vs-target capture/comparison remain outstanding. Update individual `device QA pending` rows only after those comparisons.
- The next parity pass should capture each source and TypeScript screen on Android and iOS, compare the interaction path, and update these statuses only after runtime verification.

## Design-system conversion status

The native screen map above is not evidence that the UI layer is fully converted. The original Android design system contains reusable implementations for buttons, top bars, text fields, navigation, chat items/lists, avatars, dialogs, pickers, toggles, badges, loading/error states, and related modifiers. The iOS `Component` project has corresponding reusable controls plus iconography, gradients, shadows, typography, and modal/navigation helpers. Together these source trees contain over 100 component/foundation files.

The TypeScript mobile target currently has shared color and font tokens in `packages/design-tokens`, a small app-local `components/ui.tsx` (button, card, workspace role picker), and a few specialized components. Most screen controls are still styled inline in screen files; there is no converted Seugi mobile component library yet. This is a real conversion gap, not merely a screen-file counting issue.

| Priority | Original reusable UI | Current TypeScript state | Remaining work |
| --- | --- | --- | --- |
| P0 | Button variants/sizes/loading/press states | `SeugiButton` now covers six variants, two sizes, loading/disabled/press states; existing screens use a compatibility wrapper | Match each call site's original size/type and verify screen captures |
| P0 | Top bar, bottom navigation, scaffold/safe-area patterns | `SeugiTopBar` and `SeugiBottomNavigation` are reusable; the five original tabs and iOS icon-only/Android labeled behavior are preserved | Compare on-device safe-area, shadow, and touch behavior |
| P0 | Text fields, password/code/chat inputs | `SeugiTextField`, visibility-toggle password field, six-cell numeric code field, and `SeugiChatTextField` now cover auth, school create/join, profile, room creation, timetable, chat/message search, notice reactions/editor, assignment, CatSeugi, and chat conversation | Compare original field geometry, validation, keyboard/accessory behavior, focus, and multiline editing on Android and iOS |
| P1 | Avatar, image, room image, member/chat list rows | `SeugiAvatar` centralizes image/fallback rendering in profile/settings, join requests, chat invitations and details, and workspace-member rows/profile sheets; call sites retain their native dimensions, colors, typography, and special fallback labels | Apply the shared avatar to remaining member-list rows, then compare source captures; room images and list-row layouts remain screen-specific |
| P1 | Dialogs, sheets, dropdowns, segmented controls, toggles | Role choice is a shared illustrated two-card screen used by both join entry points; other choices remain inline/native modals | Match remaining variants and interaction semantics; role screen still needs device capture comparison |
| P2 | Badges, tooltips, shadows/gradients, shimmer/loading/error states | Partial local styling | Port where used by original screens and verify on both platforms |

Until this component inventory is implemented and screen captures are compared, mobile UI conversion remains incomplete even where the destination has a TypeScript target.
