# Web screen parity audit

The original desktop client is `.upstream/seugi-desktop`; the TypeScript workspace target is `apps/web`. The current router retains the original 16 route destinations. Matching route declarations establish navigation coverage only; they do not establish visual or interaction parity.

| Route | TypeScript target | Status |
| --- | --- | --- |
| `/login` | `Pages/OnBording/Login/LoginPage.tsx` | local browser smoke-tested; provider credentials not tested |
| `/emailsignup` | `Pages/OnBording/EmailSignUp/EmailSignUpPage.tsx` | route present; runtime QA pending |
| `/emailauthentication` | `Pages/OnBording/EmailAuthentication/EmailAuthenticationPage.tsx` | route present; runtime QA pending |
| `/selectjob` | `Pages/Workspace/Selectjob/SelectJobPage.tsx` | route present; runtime QA pending |
| `/schoolcode` | `Pages/Workspace/Schoolcode/SchoolCodePage.tsx` | route present; runtime QA pending |
| `/joinsuccess` | `Pages/Workspace/JoinSuccess/JoinSuccessPage.tsx` | route present; runtime QA pending |
| `/selectschool` | `Pages/Workspace/Selectschool/SelectSchoolPage.tsx` | route present; runtime QA pending |
| `/createschool` | `Pages/Workspace/CreateSchool/CreateSchoolPage.tsx` | route present; runtime QA pending |
| `/waitingjoin` | `Pages/Workspace/WaitingJoin/WaitingJoinPage.tsx` | route present; runtime QA pending |
| `/admingeneral` | `Pages/Admin/General/AdminGeneral.tsx` | route present; runtime QA pending |
| `/adminalarm` | `Pages/Admin/Alarm/AdminAlarm.tsx` | route present; runtime QA pending |
| `/managemember` | `Pages/Admin/ManageMember/ManageMember.tsx` | route present; runtime QA pending |
| `/invitemember` | `Pages/Admin/InviteMember/InviteMember.tsx` | route present; runtime QA pending |
| `/` | `Pages/Home/home.tsx` inside `Components/Shell/Shell.tsx` | route present; runtime QA pending |
| `/chat` | `Pages/chat/chat.tsx` inside `Components/Shell/Shell.tsx` | route present; runtime QA pending |
| `/groupchat` | `Pages/GroupChat/index.tsx` inside `Components/Shell/Shell.tsx` | route present; runtime QA pending |

## Verification limits

- The local login page rendered successfully in Chrome and exposed the expected email/password and provider controls. Browser logs contained no errors, only React Router future-compatibility warnings.
- No authenticated web flow has been exercised against the TypeScript API in this pass; admin/workspace screens need a disposable local account and seeded school data for meaningful interaction checks.
- Source-to-target visual comparison remains outstanding for all routes. The web production build passes as part of `pnpm test`, but a build is not a parity test.
