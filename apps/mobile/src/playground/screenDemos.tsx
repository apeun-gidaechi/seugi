import { useState } from "react";
import { View } from "react-native";
import type { SeugiTab } from "../design-system/BottomNavigation";
import { AuthScreen } from "../screens/AuthScreen";
import { AuthStartScreen } from "../screens/auth/AuthStartScreen";
import { EmailLoginScreen } from "../screens/auth/EmailLoginScreen";
import { EmailSignupScreen } from "../screens/auth/EmailSignupScreen";
import { EmailVerificationScreen } from "../screens/auth/EmailVerificationScreen";
import { HomeScreen, NoWorkspaceHome } from "../screens/HomeScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { MealCalendar } from "../screens/MealCalendarScreen";
import { TimetablePage, TimetableWeek } from "../screens/TimetableScreen";
import { CatSeugiScreen } from "../screens/CatSeugiScreen";
import { AssignmentsScreen } from "../screens/AssignmentsScreen";
import { TaskCreateScreen } from "../screens/TaskCreateScreen";
import { NoticesScreen } from "../screens/NoticesScreen";
import { NoticeEditorScreen } from "../screens/NoticeEditorScreen";
import { WorkspaceDetailScreen } from "../screens/WorkspaceDetailScreen";
import { WorkspaceMembersScreen } from "../screens/WorkspaceMembersScreen";
import { WorkspaceInviteScreen } from "../screens/WorkspaceInviteScreen";
import { WorkspaceNotificationsScreen } from "../screens/WorkspaceNotificationsScreen";
import { WorkspaceCreateScreen } from "../screens/WorkspaceCreateScreen";
import {
  WorkspaceSetupScreen,
  CreateWorkspaceCard,
  PendingWorkspaceRequests,
} from "../screens/WorkspaceSetupScreen";
import { WorkspaceJoinScreen } from "../screens/WorkspaceJoinScreen";
import { WorkspaceJoinCodeScreen } from "../screens/WorkspaceJoinCodeScreen";
import { WorkspaceApprovalScreen } from "../screens/WorkspaceApprovalScreen";
import { WorkspaceGeneralScreen } from "../screens/WorkspaceGeneralScreen";
import { StudentInfoScreen } from "../screens/StudentInfoScreen";
import { AccountSettingsScreen } from "../screens/AccountSettingsScreen";
import { CreateRoomScreen } from "../screens/CreateRoomScreen";
import { CreateRoomMembersScreen } from "../screens/CreateRoomMembersScreen";
import { CreateGroupRoomNameScreen } from "../screens/CreateGroupRoomNameScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { ChatConversationScreen } from "../screens/ChatConversationScreen";
import { ChatInviteScreen } from "../screens/ChatInviteScreen";
import { ImagePreviewScreen } from "../screens/ImagePreviewScreen";
import { ChatImageUploadPreviewScreen } from "../screens/ChatImageUploadPreviewScreen";
import { AuthenticatedAppShell } from "../screens/AuthenticatedAppShell";
import { NoWorkspaceShell } from "../screens/NoWorkspaceShell";
import { ChatRoomMessages } from "../screens/shell/ChatRoomMessages";
import {
  demoImageUri,
  mockLegacyProfile,
  mockRoom,
  mockTimetable,
  mockWorkspace,
  mockWorkspaces,
} from "./mockData";
import type { PlaygroundDemoEntry } from "./types";

const noop = () => undefined;
const noopAsync = async () => undefined;

function AuthFlowDemo() {
  const [email, setEmail] = useState("demo@seugi.app");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("홍길동");
  const [code, setCode] = useState("");
  return (
    <AuthScreen
      hydrated
      appleAvailable={false}
      loading={false}
      error=""
      email={email}
      password={password}
      confirmPassword={confirmPassword}
      name={name}
      code={code}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onNameChange={setName}
      onCodeChange={setCode}
      onGoogleCode={noopAsync}
      onAppleSignIn={noopAsync}
      onError={noop}
      onSendVerification={async () => true}
      onLogin={noop}
      onRegister={async () => true}
    />
  );
}

function AuthStartDemo() {
  const [showOptions, setShowOptions] = useState(false);
  return (
    <AuthStartScreen
      error=""
      appleAvailable={false}
      loading={false}
      showOptions={showOptions}
      onShowOptions={() => setShowOptions(true)}
      onDismissOptions={() => setShowOptions(false)}
      onLogin={() => undefined}
      onGoogleCode={noopAsync}
      onAppleSignIn={noopAsync}
      onError={noop}
    />
  );
}

function EmailLoginDemo() {
  const [email, setEmail] = useState("demo@seugi.app");
  const [password, setPassword] = useState("");
  return (
    <EmailLoginScreen
      email={email}
      password={password}
      error=""
      loading={false}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onBack={noop}
      onSignup={noop}
      onLogin={noop}
    />
  );
}

function EmailSignupDemo() {
  const [name, setName] = useState("홍길동");
  const [email, setEmail] = useState("demo@seugi.app");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  return (
    <EmailSignupScreen
      name={name}
      email={email}
      password={password}
      confirmPassword={confirmPassword}
      error=""
      loading={false}
      validation={undefined}
      onNameChange={setName}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onConfirmPasswordChange={setConfirmPassword}
      onValidationChange={() => undefined}
      onBack={noop}
      onLogin={noop}
      onContinue={noop}
    />
  );
}

function EmailVerificationDemo() {
  const [code, setCode] = useState("");
  return (
    <EmailVerificationScreen
      code={code}
      error=""
      loading={false}
      password=""
      name="홍길동"
      waiting={false}
      seconds={120}
      onCodeChange={setCode}
      onBack={noop}
      onSend={noopAsync}
      onRegister={noop}
    />
  );
}

function WorkspaceJoinCodeDemo() {
  const [code, setCode] = useState("DEMO01");
  return (
    <WorkspaceJoinCodeScreen code={code} busy={false} onChangeCode={setCode} onContinue={noop} />
  );
}

function WorkspaceJoinFlowDemo() {
  const [step, setStep] = useState<"role" | "code" | "confirm" | "waiting">("code");
  return (
    <WorkspaceJoinScreen
      step={step}
      onReload={noopAsync}
      onNavigate={(route) => {
        if (route === "workspaceJoinCode") setStep("code");
        if (route === "workspaceJoinConfirm") setStep("confirm");
        if (route === "workspaceJoinWaiting") setStep("waiting");
      }}
      onBack={() => setStep("role")}
      onDone={() => setStep("role")}
    />
  );
}

function CreateGroupRoomNameDemo() {
  const [roomName, setRoomName] = useState("3학년 1반");
  return (
    <CreateGroupRoomNameScreen
      placeholder="채팅방"
      roomName={roomName}
      error=""
      busy={false}
      onRoomNameChange={setRoomName}
      onBack={noop}
      onComplete={noop}
    />
  );
}

function ImagePreviewDemo() {
  return (
    <ImagePreviewScreen
      visible
      uri={demoImageUri}
      onClose={noop}
      onDownload={noop}
      fileIsExist
    />
  );
}

function ChatImageUploadPreviewDemo() {
  return (
    <ChatImageUploadPreviewScreen
      visible
      imageUri={demoImageUri}
      busy={false}
      onClose={noop}
      onSend={noop}
      onRetry={noop}
    />
  );
}

function StudentInfoDemo() {
  return (
    <StudentInfoScreen
      visible
      workspace={mockWorkspace}
      profile={mockLegacyProfile}
      onClose={noop}
    />
  );
}

function AuthenticatedShellDemo() {
  const [tab, setTab] = useState<SeugiTab>("home");
  return (
    <AuthenticatedAppShell
      tab={tab}
      workspace={mockWorkspace}
      workspaces={mockWorkspaces}
      error=""
      onTabChange={setTab}
      onReload={noopAsync}
      onSelectWorkspace={noop}
      onLogout={noopAsync}
      onDeviceTokenChange={noop}
    />
  );
}

function NoWorkspaceShellDemo() {
  const [tab, setTab] = useState<SeugiTab>("home");
  return (
    <NoWorkspaceShell tab={tab} onTabChange={setTab} onReload={noopAsync} onLogout={noopAsync} />
  );
}

function CreateRoomDemo() {
  return (
    <CreateRoomScreen
      workspace={mockWorkspace}
      step="members"
      onNavigate={noop}
      onBack={noop}
      onCreated={noop}
    />
  );
}

function ChatListDemo() {
  return (
    <ChatScreen
      workspace={mockWorkspace}
      roomType="group"
      RoomMessagesComponent={ChatRoomMessages}
      isFocused
      onConversationChange={noop}
      onPreviewImage={noop}
      roomSearch=""
    />
  );
}

function ChatConversationDemo() {
  return (
    <ChatConversationScreen
      room={mockRoom}
      onBack={noop}
      onOpenRoom={noop}
      onPreviewImage={noop}
    />
  );
}

function ChatInviteDemo() {
  return (
    <ChatInviteScreen
      members={[]}
      selectedIds={[]}
      busy={false}
      notice=""
      onBack={noop}
      onToggle={noop}
      onComplete={noop}
    />
  );
}

function FlexScreen({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1 }}>{children}</View>;
}

function CreateRoomMembersDemo() {
  return (
    <CreateRoomMembersScreen
      members={[]}
      selectedMembers={[]}
      selectedIds={[]}
      error=""
      busy={false}
      loading={false}
      onToggleMember={noop}
      onRemoveSelected={noop}
      onBack={noop}
      onComplete={noop}
    />
  );
}

export const screenDemos: PlaygroundDemoEntry[] = [
  { id: "auth-flow", title: "AuthScreen", group: "Auth", subtitle: "Full auth coordinator", Component: AuthFlowDemo },
  { id: "auth-start", title: "AuthStartScreen", group: "Auth", Component: AuthStartDemo },
  { id: "email-login", title: "EmailLoginScreen", group: "Auth", Component: EmailLoginDemo },
  { id: "email-signup", title: "EmailSignupScreen", group: "Auth", Component: EmailSignupDemo },
  {
    id: "email-verification",
    title: "EmailVerificationScreen",
    group: "Auth",
    Component: EmailVerificationDemo,
  },
  {
    id: "workspace-join-code",
    title: "WorkspaceJoinCodeScreen",
    group: "Workspace",
    Component: WorkspaceJoinCodeDemo,
  },
  {
    id: "workspace-join-flow",
    title: "WorkspaceJoinScreen",
    group: "Workspace",
    Component: WorkspaceJoinFlowDemo,
  },
  {
    id: "workspace-approval",
    title: "WorkspaceApprovalScreen",
    group: "Workspace",
    Component: () => <WorkspaceApprovalScreen onDone={noop} />,
  },
  {
    id: "workspace-general",
    title: "WorkspaceGeneralScreen",
    group: "Workspace",
    Component: WorkspaceGeneralScreen,
  },
  {
    id: "workspace-create",
    title: "WorkspaceCreateScreen",
    group: "Workspace",
    Component: () => <WorkspaceCreateScreen onCreated={noopAsync} />,
  },
  {
    id: "workspace-setup",
    title: "WorkspaceSetupScreen",
    group: "Workspace",
    subtitle: "Full join/create flow",
    Component: () => (
      <WorkspaceSetupScreen onCreated={noopAsync} onLogout={noopAsync} initialRoute="start" />
    ),
  },
  {
    id: "create-workspace-card",
    title: "CreateWorkspaceCard",
    group: "Workspace",
    Component: () => <CreateWorkspaceCard onCreated={noopAsync} />,
  },
  {
    id: "pending-workspace-requests",
    title: "PendingWorkspaceRequests",
    group: "Workspace",
    Component: () => (
      <FlexScreen>
        <PendingWorkspaceRequests onChanged={noopAsync} />
      </FlexScreen>
    ),
  },
  {
    id: "workspace-detail",
    title: "WorkspaceDetailScreen",
    group: "Workspace",
    Component: () => (
      <FlexScreen>
        <WorkspaceDetailScreen
          workspaces={mockWorkspaces}
          workspace={mockWorkspace}
          onSelect={noop}
          onNavigate={noop}
          onReload={noopAsync}
        />
      </FlexScreen>
    ),
  },
  {
    id: "workspace-members",
    title: "WorkspaceMembersScreen",
    group: "Workspace",
    Component: () => (
      <FlexScreen>
        <WorkspaceMembersScreen workspace={mockWorkspace} search="" onOpenRoom={noop} />
      </FlexScreen>
    ),
  },
  {
    id: "workspace-invite",
    title: "WorkspaceInviteScreen",
    group: "Workspace",
    Component: () => (
      <FlexScreen>
        <WorkspaceInviteScreen workspace={mockWorkspace} />
      </FlexScreen>
    ),
  },
  {
    id: "workspace-notifications",
    title: "WorkspaceNotificationsScreen",
    group: "Workspace",
    Component: () => (
      <FlexScreen>
        <WorkspaceNotificationsScreen workspace={mockWorkspace} />
      </FlexScreen>
    ),
  },
  {
    id: "no-workspace-home",
    title: "NoWorkspaceHome",
    group: "Home",
    Component: () => <NoWorkspaceHome onRegister={noop} onRequests={noop} />,
  },
  {
    id: "home",
    title: "HomeScreen",
    group: "Home",
    subtitle: "Loads live API when configured",
    Component: () => (
      <FlexScreen>
        <HomeScreen
          workspace={mockWorkspace}
          onOpenCatSeugi={noop}
          onOpenMeals={noop}
          onOpenTimetable={noop}
          onOpenTasks={noop}
          onOpenWorkspace={noop}
        />
      </FlexScreen>
    ),
  },
  {
    id: "profile",
    title: "ProfileScreen",
    group: "Home",
    Component: () => (
      <FlexScreen>
        <ProfileScreen workspace={mockWorkspace} onOpenSettings={noop} />
      </FlexScreen>
    ),
  },
  {
    id: "meal-calendar",
    title: "MealCalendar",
    group: "Home",
    Component: () => (
      <FlexScreen>
        <MealCalendar workspace={mockWorkspace} />
      </FlexScreen>
    ),
  },
  {
    id: "timetable-page",
    title: "TimetablePage",
    group: "Home",
    Component: () => (
      <FlexScreen>
        <TimetablePage workspace={mockWorkspace} />
      </FlexScreen>
    ),
  },
  {
    id: "timetable-week",
    title: "TimetableWeek",
    group: "Home",
    Component: () => (
      <FlexScreen>
        <TimetableWeek entries={mockTimetable} />
      </FlexScreen>
    ),
  },
  {
    id: "cat-seugi",
    title: "CatSeugiScreen",
    group: "Home",
    Component: () => (
      <FlexScreen>
        <CatSeugiScreen workspace={mockWorkspace} />
      </FlexScreen>
    ),
  },
  {
    id: "assignments",
    title: "AssignmentsScreen",
    group: "Tasks",
    Component: () => (
      <FlexScreen>
        <AssignmentsScreen workspace={mockWorkspace} onCreateTask={noop} />
      </FlexScreen>
    ),
  },
  {
    id: "task-create",
    title: "TaskCreateScreen",
    group: "Tasks",
    Component: () => (
      <FlexScreen>
        <TaskCreateScreen workspace={mockWorkspace} onCreated={noopAsync} onBack={noop} />
      </FlexScreen>
    ),
  },
  {
    id: "notices",
    title: "NoticesScreen",
    group: "Notices",
    Component: () => (
      <FlexScreen>
        <NoticesScreen workspace={mockWorkspace} onCreate={noop} onEdit={noop} />
      </FlexScreen>
    ),
  },
  {
    id: "notice-editor",
    title: "NoticeEditorScreen",
    group: "Notices",
    Component: () => (
      <FlexScreen>
        <NoticeEditorScreen
          workspace={mockWorkspace}
          onSaved={noopAsync}
          onCancel={noop}
        />
      </FlexScreen>
    ),
  },
  {
    id: "account-settings",
    title: "AccountSettingsScreen",
    group: "Settings",
    Component: () => (
      <FlexScreen>
        <AccountSettingsScreen workspace={mockWorkspace} onLogout={noopAsync} />
      </FlexScreen>
    ),
  },
  {
    id: "student-info",
    title: "StudentInfoScreen",
    group: "Workspace",
    Component: StudentInfoDemo,
  },
  {
    id: "create-room",
    title: "CreateRoomScreen",
    group: "Chat",
    Component: CreateRoomDemo,
  },
  {
    id: "create-room-members",
    title: "CreateRoomMembersScreen",
    group: "Chat",
    Component: CreateRoomMembersDemo,
  },
  {
    id: "create-group-room-name",
    title: "CreateGroupRoomNameScreen",
    group: "Chat",
    Component: CreateGroupRoomNameDemo,
  },
  {
    id: "chat-list",
    title: "ChatScreen",
    group: "Chat",
    Component: ChatListDemo,
  },
  {
    id: "chat-conversation",
    title: "ChatConversationScreen",
    group: "Chat",
    Component: ChatConversationDemo,
  },
  { id: "chat-invite", title: "ChatInviteScreen", group: "Chat", Component: ChatInviteDemo },
  { id: "image-preview", title: "ImagePreviewScreen", group: "Media", Component: ImagePreviewDemo },
  {
    id: "chat-image-upload-preview",
    title: "ChatImageUploadPreviewScreen",
    group: "Media",
    Component: ChatImageUploadPreviewDemo,
  },
  {
    id: "authenticated-shell",
    title: "AuthenticatedAppShell",
    group: "Shell",
    subtitle: "Full app chrome",
    Component: AuthenticatedShellDemo,
  },
  {
    id: "no-workspace-shell",
    title: "NoWorkspaceShell",
    group: "Shell",
    Component: NoWorkspaceShellDemo,
  },
];
