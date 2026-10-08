import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { type Room, type Workspace } from "@seugi/contracts";
import { SeugiColor } from "@seugi/design-tokens";
import { api } from "../services/api";
import { SeugiTopBar } from "../design-system/TopBar";
import { SeugiBottomNavigation, type SeugiTab } from "../design-system/BottomNavigation";
import { SeugiTextField } from "../design-system/TextField";
import { SeugiProfileEditIcon } from "../design-system/ProfileIcons";
import { SeugiSearchIcon } from "../design-system/SearchIcon";
import { SeugiBackIcon } from "../design-system/BackIcon";
import { SeugiAddFillIcon } from "../design-system/AddIcon";
import { AssignmentsScreen } from "./AssignmentsScreen";
import { TaskCreateScreen } from "./TaskCreateScreen";
import { CatSeugiScreen } from "./CatSeugiScreen";
import { ChatScreen, type ChatImagePreview } from "./ChatScreen";
import { ImagePreviewScreen } from "./ImagePreviewScreen";
import { CreateRoomScreen } from "./CreateRoomScreen";
import { Home } from "./HomeScreen";
import { TimetablePage } from "./TimetableScreen";
import { MealCalendar } from "./MealCalendarScreen";
import { NoticesScreen } from "./NoticesScreen";
import { NoticeEditorScreen } from "./NoticeEditorScreen";
import {
  ProfileScreen,
} from "./ProfileScreen";
import { WorkspaceCreateScreen } from "./WorkspaceCreateScreen";
import { WorkspaceMembersScreen } from "./WorkspaceMembersScreen";
import { WorkspaceJoinScreen } from "./WorkspaceJoinScreen";
import { WorkspaceDetailScreen } from "./WorkspaceDetailScreen";
import { AccountSettingsScreen } from "./AccountSettingsScreen";
import { WorkspaceGeneralScreen } from "./WorkspaceGeneralScreen";
import { WorkspaceInviteScreen } from "./WorkspaceInviteScreen";
import { WorkspaceNotificationsScreen } from "./WorkspaceNotificationsScreen";
import { absoluteApiUrl } from "../utils/url";
import { markTabVisited, updateTabConversation } from "../utils/tabNavigation";
import {
  type AppDetail,
  isWorkspaceJoinDetail,
  shellDetailTitles,
  shellRouteKey,
  shellTabTitles,
} from "../navigation/shellNavigation";
import { ChatRoomMessages } from "./shell/ChatRoomMessages";
import { canCreateWorkspaceNotice } from "../utils/workspaceNoticeAccess";

type AuthenticatedAppShellProps = {
  tab: SeugiTab;
  workspace: Workspace;
  workspaces: Workspace[];
  deviceToken?: string;
  error: string;
  onTabChange: (tab: SeugiTab) => void;
  onReload: () => Promise<void>;
  onSelectWorkspace: (workspace: Workspace) => void | Promise<void>;
  onLogout: () => void | Promise<void>;
  onDeviceTokenChange: (token?: string) => void;
};

export function AuthenticatedAppShell({
  tab,
  workspace,
  workspaces,
  deviceToken,
  error,
  onTabChange,
  onReload,
  onSelectWorkspace,
  onLogout,
  onDeviceTokenChange,
}: AuthenticatedAppShellProps) {
  const { width: routeWidth } = useWindowDimensions();
  const [detailStack, setDetailStack] = useState<AppDetail[]>([]);
  const detail = detailStack[detailStack.length - 1];
  const [createdRoom, setCreatedRoom] = useState<Room>();
  const [activeConversations, setActiveConversations] = useState<Partial<Record<SeugiTab, Room>>>({});
  const [visitedTabs, setVisitedTabs] = useState<Set<SeugiTab>>(() => new Set([tab]));
  const activeConversation = activeConversations[tab];
  const updateConversation = useCallback((conversationTab: SeugiTab, room?: Room) => {
    setActiveConversations((current) => updateTabConversation(current, conversationTab, room));
    if (room) setCreatedRoom(undefined);
  }, []);
  const [activeImagePreview, setActiveImagePreview] = useState<ChatImagePreview>();
  const [roomSearchActive, setRoomSearchActive] = useState(false);
  const [roomSearch, setRoomSearch] = useState("");
  const [memberSearchActive, setMemberSearchActive] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [editingNotice, setEditingNotice] = useState<import("@seugi/contracts").Notification>();
  const [canCreateNotice, setCanCreateNotice] = useState(false);
  const [noticeRefreshToken, setNoticeRefreshToken] = useState(0);
  const [homeRefreshToken, setHomeRefreshToken] = useState(0);
  const [profileRefreshToken, setProfileRefreshToken] = useState(0);
  const routeProgress = useRef(new Animated.Value(1)).current;
  const routeDirection = useRef(1);
  const previousRouteKey = useRef<string | undefined>(undefined);
  const updatePersonalConversation = useCallback((room?: Room) => { routeDirection.current = room ? 1 : -1; updateConversation("chat", room); }, [updateConversation]);
  const updateGroupConversation = useCallback((room?: Room) => { routeDirection.current = room ? 1 : -1; updateConversation("group", room); }, [updateConversation]);
  const pushDetail = (next: AppDetail) => { routeDirection.current = 1; setDetailStack((current) => [...current, next]); };
  const goBack = () => {
    if (detail === "workspaceMembers" && memberSearchActive) {
      setMemberSearchActive(false);
      setMemberSearch("");
      return;
    }
    routeDirection.current = -1;
    setDetailStack((current) => current.slice(0, -1));
  };
  const closeRoomSearch = () => { setRoomSearchActive(false); setRoomSearch(""); };
  const changeTab = (next: SeugiTab) => { routeDirection.current = 0; setDetailStack([]); setActiveImagePreview(undefined); setMemberSearchActive(false); setMemberSearch(""); closeRoomSearch(); setVisitedTabs((current) => markTabVisited(current, next)); onTabChange(next); };
  const switchWorkspace = async (selected: Workspace) => {
    try {
      await onSelectWorkspace(selected);
      routeDirection.current = 0;
      setDetailStack([]);
      setActiveConversations({});
      setMemberSearchActive(false);
      setMemberSearch("");
      closeRoomSearch();
      onTabChange("home");
    } catch {
      // Keep the current workspace screen open if persisting the selection fails.
    }
  };
  const title = detail ? shellDetailTitles[detail] : activeConversation?.name ?? shellTabTitles[tab];
  const workspaceJoinRoute = isWorkspaceJoinDetail(detail);
  const routeKey = shellRouteKey(tab, detailStack, activeConversation?.id);

  useEffect(() => {
    if (previousRouteKey.current === undefined) {
      previousRouteKey.current = routeKey;
      return;
    }
    if (previousRouteKey.current === routeKey) return;
    previousRouteKey.current = routeKey;
    routeProgress.setValue(0);
    const animation = Animated.timing(routeProgress, {
      toValue: 1,
      duration: Platform.OS === "android" ? 400 : 320,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [routeKey, routeProgress]);

  const routeTranslateX = routeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: Platform.OS === "ios"
      ? [routeDirection.current === 0 ? 0 : routeDirection.current < 0 ? -routeWidth / 3 : routeWidth, 0]
      : [0, 0],
  });

  useEffect(() => {
    let active = true;
    Promise.all([api.memberInfo(), api.myProfile(workspace.id)]).then(([member, profile]) => {
      if (!active) return;
      setCanCreateNotice(
        canCreateWorkspaceNotice(workspace, member.data?.id, profile.data?.role),
      );
    }).catch(() => { if (active) setCanCreateNotice(false); });
    return () => { active = false; };
  }, [workspace.id, workspace.ownerId]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (roomSearchActive) {
        closeRoomSearch();
        return true;
      }
      if (detail === "workspaceMembers" && memberSearchActive) {
        setMemberSearchActive(false);
        setMemberSearch("");
        return true;
      }
      if (detailStack.length > 0) {
        routeDirection.current = -1;
        setDetailStack((current) => current.slice(0, -1));
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [activeConversation, detailStack.length, memberSearchActive, roomSearchActive]);

  return (
    <SafeAreaView style={styles.page}>
      <Animated.View style={[styles.routeContent, { opacity: routeProgress, transform: [{ translateX: routeTranslateX }] }]}>
      {!activeConversation && detail !== "createNotice" && detail !== "editNotice" && detail !== "createRoom" && detail !== "createGroupRoomName" && detail !== "createTask" && !workspaceJoinRoute ? <SeugiTopBar
        backgroundColor={tab === "chat" || tab === "group" ? SeugiColor.White : SeugiColor.Primary050}
        shadow={tab === "chat" || tab === "group"}
        leading={detail || (roomSearchActive && (tab === "chat" || tab === "group")) ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={detail === "workspaceMembers" && memberSearchActive ? "멤버 검색 닫기" : detail ? "뒤로" : "검색 닫기"}
            onPress={detail ? goBack : closeRoomSearch}
          >
            <SeugiBackIcon />
          </TouchableOpacity>
        ) : null}
        title={!detail && roomSearchActive && (tab === "chat" || tab === "group") ? <SeugiTextField autoFocus value={roomSearch} onChangeText={setRoomSearch} onSubmitEditing={Platform.OS === "android" ? closeRoomSearch : undefined} returnKeyType="search" placeholder="채팅방 검색" fieldStyle={styles.headerSearchField} style={styles.headerSearchInput} /> : detail === "workspaceMembers" && memberSearchActive ? <SeugiTextField autoFocus accessibilityLabel="멤버 검색" value={memberSearch} onChangeText={setMemberSearch} returnKeyType="search" placeholder="멤버 검색" fieldStyle={styles.headerSearchField} style={styles.headerSearchInput} /> : <Text style={styles.title}>{title}</Text>}
        trailing={detail === "workspaceMembers" ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={memberSearchActive ? "멤버 검색 닫기" : "멤버 검색"} accessibilityState={{ disabled: Platform.OS !== "ios" }} disabled={Platform.OS !== "ios"} onPress={() => { setMemberSearchActive((active) => !active); setMemberSearch(""); }}>
            {memberSearchActive ? <Text style={styles.link}>취소</Text> : <SeugiSearchIcon size={24} color={SeugiColor.Gray800} />}
          </TouchableOpacity>
        ) : !detail && tab === "home" ? (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => void onReload().then(() => setHomeRefreshToken((current) => current + 1)).catch(() => undefined)}
          >
            <Text style={styles.link}>새로고침</Text>
          </TouchableOpacity>
        ) : !detail && tab === "notice" && canCreateNotice ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="공지 작성" onPress={() => { setEditingNotice(undefined); pushDetail("createNotice"); }}>
            <SeugiProfileEditIcon color={SeugiColor.Gray800} />
          </TouchableOpacity>
        ) : !detail && !roomSearchActive && (tab === "chat" || tab === "group") ? (
          <View style={styles.headerActions}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="채팅방 만들기" onPress={() => { setCreatedRoom(undefined); pushDetail("createRoom"); }}><SeugiAddFillIcon color={SeugiColor.Gray800} /></TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="채팅방 검색" onPress={() => { setRoomSearch(""); setRoomSearchActive(true); }}><SeugiSearchIcon size={24} color={SeugiColor.Gray800} /></TouchableOpacity>
          </View>
        ) : null}
      /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {visitedTabs.has("home") ? <View pointerEvents={tab === "home" && !detail ? "auto" : "none"} style={tab === "home" && !detail ? styles.tabRoot : styles.hiddenTabRoot}>
        <Home
          workspace={workspace}
          refreshToken={homeRefreshToken}
          onOpenCatSeugi={() => pushDetail("catSeugi")}
          onOpenMeals={() => pushDetail("meals")}
          onOpenTimetable={() => pushDetail("timetable")}
          onOpenTasks={() => pushDetail("tasks")}
          onOpenWorkspace={() => pushDetail("workspace")}
        />
      </View> : null}
      {visitedTabs.has("chat") ? <View pointerEvents={tab === "chat" && !detail ? "auto" : "none"} style={tab === "chat" && !detail ? styles.tabRoot : styles.hiddenTabRoot}>
        <ChatScreen
          workspace={workspace}
          roomType="personal"
          RoomMessagesComponent={ChatRoomMessages}
          initialRoom={createdRoom?.type === "PERSONAL" ? createdRoom : undefined}
          isFocused={tab === "chat" && !detail}
          roomSearch={roomSearch}
          onConversationChange={updatePersonalConversation}
          onPreviewImage={setActiveImagePreview}
        />
      </View> : null}
      {visitedTabs.has("group") ? <View pointerEvents={tab === "group" && !detail ? "auto" : "none"} style={tab === "group" && !detail ? styles.tabRoot : styles.hiddenTabRoot}>
        <ChatScreen
          workspace={workspace}
          roomType="group"
          RoomMessagesComponent={ChatRoomMessages}
          initialRoom={createdRoom?.type === "GROUP" ? createdRoom : undefined}
          isFocused={tab === "group" && !detail}
          roomSearch={roomSearch}
          onConversationChange={updateGroupConversation}
          onPreviewImage={setActiveImagePreview}
        />
      </View> : null}
      {visitedTabs.has("notice") ? <View pointerEvents={tab === "notice" && !detail ? "auto" : "none"} style={tab === "notice" && !detail ? styles.tabRoot : styles.hiddenTabRoot}>
        <NoticesScreen
          workspace={workspace}
          refreshToken={noticeRefreshToken}
          onCreate={() => { setEditingNotice(undefined); pushDetail("createNotice"); }}
          onEdit={(notice) => { setEditingNotice(notice); pushDetail("editNotice"); }}
        />
      </View> : null}
      {visitedTabs.has("profile") ? <View pointerEvents={tab === "profile" && !detail ? "auto" : "none"} style={tab === "profile" && !detail ? styles.tabRoot : styles.hiddenTabRoot}>
        <ProfileScreen workspace={workspace} refreshToken={profileRefreshToken} onOpenSettings={() => pushDetail("accountSettings")} />
      </View> : null}

      {detail === "meals" ? <MealCalendar workspace={workspace} /> : null}
      {detail === "timetable" ? <TimetablePage workspace={workspace} /> : null}
      {detail === "tasks" ? <AssignmentsScreen workspace={workspace} onCreateTask={() => pushDetail("createTask")} /> : null}
      {detail === "createTask" ? <TaskCreateScreen workspace={workspace} onCreated={async () => goBack()} onBack={goBack} /> : null}
      {detail === "createNotice" || detail === "editNotice" ? (
        <NoticeEditorScreen
          workspace={workspace}
          initial={editingNotice}
          onSaveSucceeded={() => setNoticeRefreshToken((current) => current + 1)}
          onCancel={() => { setEditingNotice(undefined); goBack(); }}
          onSaved={async () => { setEditingNotice(undefined); goBack(); }}
        />
      ) : null}
      {detail === "catSeugi" ? <CatSeugiScreen workspace={workspace} /> : null}
      {detail === "workspace" ? <WorkspaceDetailScreen workspaces={workspaces} workspace={workspace} onSelect={switchWorkspace} onNavigate={pushDetail} onReload={onReload} /> : null}
      {detail === "workspaceGeneral" ? <WorkspaceGeneralScreen /> : null}
      {detail === "workspaceMembers" ? <WorkspaceMembersScreen workspace={workspace} search={memberSearch} onOpenRoom={(room) => { routeDirection.current = 1; setCreatedRoom(room); setDetailStack([]); setVisitedTabs((current) => markTabVisited(current, "chat")); onTabChange("chat"); }} /> : null}
      {detail === "workspaceInvite" ? <WorkspaceInviteScreen workspace={workspace} /> : null}
      {detail === "workspaceNotifications" ? <WorkspaceNotificationsScreen workspace={workspace} deviceToken={deviceToken} onDeviceTokenChange={onDeviceTokenChange} /> : null}
      {detail === "workspaceCreate" ? (
        <WorkspaceCreateScreen
          onCreated={async () => {
            await onReload().catch(() => undefined);
            goBack();
          }}
        />
      ) : null}
      {workspaceJoinRoute ? <WorkspaceJoinScreen
        step={detail === "workspaceJoin" ? "role" : detail === "workspaceJoinCode" ? "code" : detail === "workspaceJoinConfirm" ? "confirm" : "waiting"}
        onReload={onReload}
        onNavigate={(next) => pushDetail(next)}
        onBack={goBack}
        onDone={() => { routeDirection.current = -1; setDetailStack([]); setActiveConversations({}); closeRoomSearch(); setVisitedTabs((current) => markTabVisited(current, "home")); onTabChange("home"); }}
      /> : null}
      {detail === "accountSettings" ? <AccountSettingsScreen workspace={workspace} onLogout={onLogout} onProfileUpdated={() => setProfileRefreshToken((current) => current + 1)} /> : null}
      {(detail === "createRoom" || detail === "createGroupRoomName") && (tab === "chat" || tab === "group") ? (
        <CreateRoomScreen
          workspace={workspace}
          step={detail === "createRoom" ? "members" : "name"}
          onNavigate={(next) => pushDetail(next)}
          onBack={goBack}
          onCreated={(room) => { setCreatedRoom(room); goBack(); }}
        />
      ) : null}
      </Animated.View>

      {!detail && !activeConversation ? <SeugiBottomNavigation selected={tab} onSelect={changeTab} /> : null}
      {Platform.OS === "ios" ? <ImagePreviewScreen
        visible={!!activeImagePreview}
        uri={activeImagePreview ? absoluteApiUrl(activeImagePreview.url) : undefined}
        onClose={() => { activeImagePreview?.onClose?.(); setActiveImagePreview(undefined); }}
        onDownload={() => undefined}
        onSend={activeImagePreview?.onSend ? () => { const preview = activeImagePreview; setActiveImagePreview(undefined); preview.onClose?.(); preview.onSend?.(); } : undefined}
      /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: SeugiColor.Primary050 },
  routeContent: { flex: 1 },
  tabRoot: { flex: 1 },
  hiddenTabRoot: { flex: 1, display: "none" },
  back: { color: SeugiColor.Gray700, fontSize: 30, lineHeight: 34 },
  title: { flex: 1, textAlign: "left", fontSize: 18, fontWeight: "700" },
  headerSearchField: { flex: 1, minWidth: 0, height: 42, minHeight: 42, borderWidth: 0, borderRadius: 10 },
  headerSearchInput: { fontSize: 16, paddingHorizontal: 12 },
  headerActions: { width: 64, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 12 },
  headerActionIcon: { color: SeugiColor.Gray800, fontSize: 28, lineHeight: 32 },
  link: { color: SeugiColor.Primary500 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
});
