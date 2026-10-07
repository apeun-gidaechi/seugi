import { useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { type Room, type Workspace } from "@seugi/contracts";
import { SeugiColor } from "@seugi/design-tokens";
import { AssignmentsScreen, TaskCreateScreen } from "./AssignmentsScreen";
import { CatSeugiScreen } from "./CatSeugiScreen";
import { ChatScreen } from "./ChatScreen";
import { ChatConversationScreen } from "./ChatConversationScreen";
import { CreateRoomScreen } from "./CreateRoomScreen";
import {
  Home,
  MealCalendar,
  TimetablePage,
  type HomeDetail,
} from "./HomeScreen";
import { NoticeEditorScreen, NoticesScreen } from "./NoticesScreen";
import {
  ProfileScreen,
  AccountSettingsScreen,
  WorkspaceCreateScreen,
  WorkspaceDetailScreen,
  WorkspaceEditScreen,
  WorkspaceInviteScreen,
  WorkspaceJoinRequestsScreen,
  WorkspaceJoinScreen,
  WorkspaceMembersScreen,
  WorkspaceNotificationsScreen,
  WorkspaceOrganizationScreen,
  WorkspacePendingScreen,
  type WorkspaceSection,
} from "./ProfileScreen";

export type Tab = "home" | "chat" | "group" | "notice" | "profile";
const tabs: Array<[Tab, string]> = [
  ["home", "홈"],
  ["chat", "채팅"],
  ["group", "단체"],
  ["notice", "알림"],
  ["profile", "프로필"],
];
const tabTitles: Record<Tab, string> = {
  home: "홈",
  chat: "채팅",
  group: "단체",
  notice: "알림",
  profile: "프로필",
};
type AppDetail = HomeDetail | "createRoom" | "createTask" | "createNotice" | "editNotice" | "accountSettings" | WorkspaceSection;
const detailTitles: Record<AppDetail, string> = {
  meals: "급식",
  timetable: "시간표",
  tasks: "과제",
  catSeugi: "캣스기",
  workspace: "학교 관리",
  createRoom: "멤버 선택",
  createTask: "과제 만들기",
  createNotice: "공지 작성",
  editNotice: "공지 수정",
  accountSettings: "설정",
  workspaceEdit: "학교 정보 수정",
  workspaceMembers: "구성원",
  workspaceJoinRequests: "가입 신청 관리",
  workspaceInvite: "초대 코드",
  workspaceNotifications: "알림 설정",
  workspaceOrganization: "조직도",
  workspacePending: "가입 승인 대기",
  workspaceCreate: "새 학교 만들기",
  workspaceJoin: "학교 가입",
};

type AuthenticatedAppShellProps = {
  tab: Tab;
  workspace: Workspace;
  workspaces: Workspace[];
  error: string;
  onTabChange: (tab: Tab) => void;
  onReload: () => Promise<void>;
  onSelectWorkspace: (workspace: Workspace) => void;
  onLogout: () => void | Promise<void>;
};

export function AuthenticatedAppShell({
  tab,
  workspace,
  workspaces,
  error,
  onTabChange,
  onReload,
  onSelectWorkspace,
  onLogout,
}: AuthenticatedAppShellProps) {
  const [detailStack, setDetailStack] = useState<AppDetail[]>([]);
  const detail = detailStack[detailStack.length - 1];
  const [createdRoom, setCreatedRoom] = useState<Room>();
  const [activeConversation, setActiveConversation] = useState<Room>();
  const [editingNotice, setEditingNotice] = useState<import("@seugi/contracts").Notification>();
  const pushDetail = (next: AppDetail) => setDetailStack((current) => [...current, next]);
  const goBack = () => setDetailStack((current) => current.slice(0, -1));
  const changeTab = (next: Tab) => { setDetailStack([]); setActiveConversation(undefined); onTabChange(next); };
  const title = detail ? detailTitles[detail] : activeConversation?.name ?? tabTitles[tab];

  return (
    <SafeAreaView style={styles.page}>
      {!activeConversation ? <View style={styles.header}>
        {detail ? (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={goBack}
          >
            <Text style={styles.back}>‹</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <Text style={styles.title}>{title}</Text>
        {!detail && tab === "home" ? (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => void onReload().catch(() => undefined)}
          >
            <Text style={styles.link}>새로고침</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.actionPlaceholder} />
        )}
      </View> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {detail === "meals" ? <MealCalendar workspace={workspace} /> : null}
      {detail === "timetable" ? <TimetablePage workspace={workspace} /> : null}
      {detail === "tasks" ? <AssignmentsScreen workspace={workspace} onCreateTask={() => pushDetail("createTask")} /> : null}
      {detail === "createTask" ? <TaskCreateScreen workspace={workspace} onCreated={async () => goBack()} /> : null}
      {detail === "createNotice" || detail === "editNotice" ? (
        <NoticeEditorScreen
          workspace={workspace}
          initial={editingNotice}
          onCancel={() => { setEditingNotice(undefined); goBack(); }}
          onSaved={async () => { setEditingNotice(undefined); goBack(); }}
        />
      ) : null}
      {detail === "catSeugi" ? <CatSeugiScreen /> : null}
      {detail === "workspace" ? <WorkspaceDetailScreen workspaces={workspaces} workspace={workspace} onSelect={onSelectWorkspace} onNavigate={pushDetail} /> : null}
      {detail === "workspaceEdit" ? <WorkspaceEditScreen workspace={workspace} onReload={onReload} /> : null}
      {detail === "workspaceMembers" ? <WorkspaceMembersScreen workspace={workspace} /> : null}
      {detail === "workspaceJoinRequests" ? <WorkspaceJoinRequestsScreen workspace={workspace} /> : null}
      {detail === "workspaceInvite" ? <WorkspaceInviteScreen workspace={workspace} /> : null}
      {detail === "workspaceNotifications" ? <WorkspaceNotificationsScreen workspace={workspace} /> : null}
      {detail === "workspaceOrganization" ? <WorkspaceOrganizationScreen workspace={workspace} /> : null}
      {detail === "workspacePending" ? <WorkspacePendingScreen onReload={onReload} /> : null}
      {detail === "workspaceCreate" ? <WorkspaceCreateScreen onReload={onReload} /> : null}
      {detail === "workspaceJoin" ? <WorkspaceJoinScreen onReload={onReload} /> : null}
      {detail === "accountSettings" ? <AccountSettingsScreen onLogout={onLogout} /> : null}
      {detail === "createRoom" && (tab === "chat" || tab === "group") ? (
        <CreateRoomScreen
          workspace={workspace}
          onBack={goBack}
          onCreated={(room) => { setCreatedRoom(room); goBack(); }}
        />
      ) : null}
      {!detail && tab === "home" ? (
        <Home
          workspace={workspace}
          onOpenCatSeugi={() => pushDetail("catSeugi")}
          onOpenMeals={() => pushDetail("meals")}
          onOpenTimetable={() => pushDetail("timetable")}
          onOpenTasks={() => pushDetail("tasks")}
          onOpenWorkspace={() => pushDetail("workspace")}
        />
      ) : null}
      {!detail && (tab === "chat" || tab === "group") ? (
        <ChatScreen
          key={tab}
          workspace={workspace}
          roomType={tab === "group" ? "group" : "personal"}
          RoomMessagesComponent={RoomMessages}
          onCreateRoom={() => { setCreatedRoom(undefined); pushDetail("createRoom"); }}
          initialRoom={createdRoom}
          onConversationChange={(room) => { setActiveConversation(room); if (room) setCreatedRoom(undefined); }}
        />
      ) : null}
      {!detail && tab === "notice" ? (
        <NoticesScreen
          workspace={workspace}
          onCreate={() => { setEditingNotice(undefined); pushDetail("createNotice"); }}
          onEdit={(notice) => { setEditingNotice(notice); pushDetail("editNotice"); }}
        />
      ) : null}
      {!detail && tab === "profile" ? (
        <ProfileScreen
          workspace={workspace}
          onOpenSettings={() => pushDetail("accountSettings")}
        />
      ) : null}

      {!detail && !activeConversation ? (
        <View style={styles.tabbar}>
          {tabs.map(([key, label]) => (
            <TouchableOpacity
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: tab === key }}
              onPress={() => changeTab(key)}
              style={styles.tab}
            >
              <Text style={tab === key ? styles.activeTab : styles.inactiveTab}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function RoomMessages({
  room,
  onBack,
}: {
  room: Parameters<typeof ChatConversationScreen>[0]["room"];
  onBack: () => void;
}) {
  return <ChatConversationScreen room={room} onBack={onBack} />;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: SeugiColor.Primary050 },
  header: {
    height: 58,
    backgroundColor: SeugiColor.Primary050,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: { color: SeugiColor.Gray700, fontSize: 30, lineHeight: 34 },
  backPlaceholder: { width: 36 },
  actionPlaceholder: { width: 64 },
  title: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700" },
  link: { color: SeugiColor.Primary500 },
  tabbar: {
    height: 62,
    flexDirection: "row",
    backgroundColor: SeugiColor.White,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 5,
  },
  tab: { flex: 1, justifyContent: "center", alignItems: "center" },
  activeTab: { color: SeugiColor.Primary500, fontWeight: "700" },
  inactiveTab: { color: SeugiColor.Gray300 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
});
