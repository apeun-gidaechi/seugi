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

## Known audit limits

- The current mobile app has 11 screen source files, but those files contain the route destinations and sub-steps above. File count alone understates the number of UI states.
- Route presence is source-level evidence only. It does not prove matching layout, text, state transitions, permissions, system back behavior, or parity on real devices.
- The iOS simulator launch verified the login and email-sign-up path. Google sign-in was absent because `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` is not configured in the local app environment; provider sign-in still needs credential-backed runtime verification.
- The next parity pass should capture each source and TypeScript screen on Android and iOS, compare the interaction path, and update these statuses only after runtime verification.
