import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { type Workspace } from "@seugi/contracts";
import { SeugiColor } from "@seugi/design-tokens";
import { AssignmentsScreen as Assignments } from "./AssignmentsScreen";
import { ChatScreen } from "./ChatScreen";
import { ChatConversationScreen } from "./ChatConversationScreen";
import { Home, MealCalendar, TimetablePage } from "./HomeScreen";
import { NoticesScreen as Notices } from "./NoticesScreen";
import { ProfileScreen } from "./ProfileScreen";

export type Tab = "home" | "meals" | "timetable" | "tasks" | "chat" | "notice" | "profile";
const tabs: Array<[Tab, string]> = [["home", "홈"], ["meals", "급식"], ["timetable", "시간표"], ["tasks", "과제"], ["chat", "채팅"], ["notice", "공지"], ["profile", "프로필"]];

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

export function AuthenticatedAppShell({ tab, workspace, workspaces, error, onTabChange, onReload, onSelectWorkspace, onLogout }: AuthenticatedAppShellProps) {
  return <SafeAreaView style={styles.page}><View style={styles.header}><Text style={styles.title}>{workspace?.name ?? "스기"}</Text><TouchableOpacity onPress={() => onReload().catch(() => undefined)}><Text style={styles.link}>새로고침</Text></TouchableOpacity></View>{error ? <Text style={styles.error}>{error}</Text> : null}{tab === "home" && <Home workspace={workspace} />}{tab === "meals" && <MealCalendar workspace={workspace} />}{tab === "timetable" && <TimetablePage workspace={workspace} />}{tab === "tasks" && <Assignments workspace={workspace} />}{tab === "chat" && <ChatScreen workspace={workspace} RoomMessagesComponent={RoomMessages} />}{tab === "notice" && <Notices workspace={workspace} />}{tab === "profile" && <ProfileScreen workspaces={workspaces} workspace={workspace} onSelect={onSelectWorkspace} onReload={onReload} onLogout={onLogout} />}<View style={styles.tabbar}>{tabs.map(([key, label]) => <TouchableOpacity key={key} onPress={() => onTabChange(key)} style={styles.tab}><Text style={tab === key ? styles.activeTab : styles.inactiveTab}>{label}</Text></TouchableOpacity>)}</View></SafeAreaView>;
}

function RoomMessages({ room, onBack }: { room: Parameters<typeof ChatConversationScreen>[0]["room"]; onBack: () => void }) {
  return <ChatConversationScreen room={room} onBack={onBack} />;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: SeugiColor.Primary050 }, header: { height: 58, backgroundColor: SeugiColor.White, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, title: { fontSize: 20, fontWeight: "700" }, link: { color: SeugiColor.Primary500 }, tabbar: { height: 64, flexDirection: "row", backgroundColor: SeugiColor.White, borderTopWidth: 1, borderColor: SeugiColor.Gray300 }, tab: { flex: 1, justifyContent: "center", alignItems: "center" }, activeTab: { color: SeugiColor.Primary500, fontWeight: "700" }, inactiveTab: { color: SeugiColor.Gray500 }, error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" } });
