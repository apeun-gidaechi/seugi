# Web screen parity audit

The original desktop client is `.upstream/seugi-desktop`; the TypeScript workspace target is `apps/web`. The current router retains the original 16 route destinations. Matching route declarations establish navigation coverage only; they do not establish visual or interaction parity.

| Route                  | TypeScript target                                                 | Status                                                      |
| ---------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------- |
| `/login`               | `Pages/OnBording/Login/LoginPage.tsx`                             | local browser smoke-tested; provider credentials not tested |
| `/emailsignup`         | `Pages/OnBording/EmailSignUp/EmailSignUpPage.tsx`                 | route present; runtime QA pending                           |
| `/emailauthentication` | `Pages/OnBording/EmailAuthentication/EmailAuthenticationPage.tsx` | route present; runtime QA pending                           |
| `/selectjob`           | `Pages/Workspace/Selectjob/SelectJobPage.tsx`                     | route present; runtime QA pending                           |
| `/schoolcode`          | `Pages/Workspace/Schoolcode/SchoolCodePage.tsx`                   | route present; runtime QA pending                           |
| `/joinsuccess`         | `Pages/Workspace/JoinSuccess/JoinSuccessPage.tsx`                 | route present; runtime QA pending                           |
| `/selectschool`        | `Pages/Workspace/Selectschool/SelectSchoolPage.tsx`               | route present; runtime QA pending                           |
| `/createschool`        | `Pages/Workspace/CreateSchool/CreateSchoolPage.tsx`               | route present; runtime QA pending                           |
| `/waitingjoin`         | `Pages/Workspace/WaitingJoin/WaitingJoinPage.tsx`                 | route present; runtime QA pending                           |
| `/admingeneral`        | `Pages/Admin/General/AdminGeneral.tsx`                            | route present; runtime QA pending                           |
| `/adminalarm`          | `Pages/Admin/Alarm/AdminAlarm.tsx`                                | route present; runtime QA pending                           |
| `/managemember`        | `Pages/Admin/ManageMember/ManageMember.tsx`                       | route present; runtime QA pending                           |
| `/invitemember`        | `Pages/Admin/InviteMember/InviteMember.tsx`                       | route present; runtime QA pending                           |
| `/`                    | `Pages/Home/home.tsx` inside `Components/Shell/Shell.tsx`         | route present; runtime QA pending                           |
| `/chat`                | `Pages/chat/chat.tsx` inside `Components/Shell/Shell.tsx`         | route present; runtime QA pending                           |
| `/groupchat`           | `Pages/GroupChat/index.tsx` inside `Components/Shell/Shell.tsx`   | route present; runtime QA pending                           |

## Nested and modal screen inventory

The 16-route count above excludes several screens that the original desktop client presents inside its home, profile, or chat views. The target retains these as nested/modal UI rather than adding routes, matching the source navigation structure. This table verifies that a TypeScript component and a reachable parent flow exist; it is not visual or runtime parity evidence.

| Original nested screen / flow        | TypeScript target                                                                                                                  | Reachability evidence                                                                   | Status             |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------ |
| Weekly timetable detail              | `Components/DetailTimetable/DetailTimeTable.tsx`                                                                                   | Home `TimeTable` opens it from the calendar-arrow action                                | runtime QA pending |
| Timetable creation                   | `Components/DetailTimetable/CreateTimetable/CreateTimetable.tsx`                                                                   | Home `TimeTable` opens it from the plus action for non-students                         | runtime QA pending |
| Timetable update/delete              | `Components/DetailTimetable/PopOver/PopOver.tsx`, `ModifyTimetable/ModifyTimetable.tsx`, and `DeleteTimetable/DeleteTimetable.tsx` | A populated timetable cell opens the popover, whose actions open the corresponding form | runtime QA pending |
| Notice creation and editing          | `Components/Home/Notification/CreateNotice/CreateNotice.tsx` and `ChangeNotice/ChangeNotice.tsx`                                   | Home notification create action and per-notice action menu                              | runtime QA pending |
| Notice reaction picker and alert     | `Components/Home/Notification/Emoji/emojipicker.tsx` and `Components/Alert/Alert.tsx`                                              | Notice reaction controls and action feedback                                            | runtime QA pending |
| Workspace switcher                   | `Components/Home/ChangeSchool/ChangeSchool.tsx`                                                                                    | Home `Schools` card opens it; it links to workspace create/join routes                  | runtime QA pending |
| Profile editor and field correction  | `Components/Profile/SettingProfile/SettingProfile.tsx` and `Profile/Correction/Correction.tsx`                                     | Sidebar profile popover opens account settings; profile fields open correction UI       | runtime QA pending |
| Group-chat creation                  | `Components/Chat/CreateRoomPlus/createRoomPlus.tsx`                                                                                | Group-chat sidebar plus action opens the creation modal                                 | runtime QA pending |
| Chat room selection and message view | `Components/Chat/chatRoom/Select/index.tsx` and `unSelect/index.tsx`                                                               | `/chat` and `/groupchat` render selected/empty states based on sidebar selection        | runtime QA pending |

## Verification limits

- The local login page rendered successfully in Chrome and exposed the expected email/password and provider controls. Browser logs contained no errors, only React Router future-compatibility warnings.
- No authenticated web flow has been exercised against the TypeScript API in this pass; admin/workspace screens need a disposable local account and seeded school data for meaningful interaction checks.
- Source-to-target visual comparison remains outstanding for all routes. The web production build passes as part of `pnpm test`, but a build is not a parity test.
