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
import { AssignmentsScreen } from "./AssignmentsScreen";
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
import { NoticesScreen } from "./NoticesScreen";
import { ProfileScreen } from "./ProfileScreen";

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
type AppDetail = HomeDetail | "createRoom";
const detailTitles: Record<AppDetail, string> = {
  meals: "급식",
  timetable: "시간표",
  tasks: "과제",
  catSeugi: "캣스기",
  createRoom: "멤버 선택",
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
  const [detail, setDetail] = useState<AppDetail>();
  const [createdRoom, setCreatedRoom] = useState<Room>();
  const title = detail ? detailTitles[detail] : tabTitles[tab];

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        {detail ? (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => setDetail(undefined)}
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
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {detail === "meals" ? <MealCalendar workspace={workspace} /> : null}
      {detail === "timetable" ? <TimetablePage workspace={workspace} /> : null}
      {detail === "tasks" ? <AssignmentsScreen workspace={workspace} /> : null}
      {detail === "catSeugi" ? <CatSeugiScreen /> : null}
      {detail === "createRoom" && (tab === "chat" || tab === "group") ? (
        <CreateRoomScreen
          workspace={workspace}
          roomType={tab === "group" ? "group" : "personal"}
          onBack={() => setDetail(undefined)}
          onCreated={(room) => { setCreatedRoom(room); setDetail(undefined); }}
        />
      ) : null}
      {!detail && tab === "home" ? (
        <Home
          workspace={workspace}
          onOpenCatSeugi={() => setDetail("catSeugi")}
          onOpenMeals={() => setDetail("meals")}
          onOpenTimetable={() => setDetail("timetable")}
          onOpenTasks={() => setDetail("tasks")}
          onOpenProfile={() => onTabChange("profile")}
        />
      ) : null}
      {!detail && (tab === "chat" || tab === "group") ? (
        <ChatScreen
          key={tab}
          workspace={workspace}
          roomType={tab === "group" ? "group" : "personal"}
          RoomMessagesComponent={RoomMessages}
          onCreateRoom={() => { setCreatedRoom(undefined); setDetail("createRoom"); }}
          initialRoom={createdRoom}
        />
      ) : null}
      {!detail && tab === "notice" ? (
        <NoticesScreen workspace={workspace} />
      ) : null}
      {!detail && tab === "profile" ? (
        <ProfileScreen
          workspaces={workspaces}
          workspace={workspace}
          onSelect={onSelectWorkspace}
          onReload={onReload}
          onLogout={onLogout}
        />
      ) : null}

      {!detail ? (
        <View style={styles.tabbar}>
          {tabs.map(([key, label]) => (
            <TouchableOpacity
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: tab === key }}
              onPress={() => onTabChange(key)}
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
