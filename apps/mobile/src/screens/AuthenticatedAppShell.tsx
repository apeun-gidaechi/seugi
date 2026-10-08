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
import Svg, { Path } from "react-native-svg";
import { api } from "../services/api";
import { SeugiTopBar } from "../design-system/TopBar";
import { SeugiBottomNavigation, type SeugiTab } from "../design-system/BottomNavigation";
import { SeugiTextField } from "../design-system/TextField";
import { SeugiProfileEditIcon } from "../design-system/ProfileIcons";
import { SeugiSearchIcon } from "../design-system/SearchIcon";
import { SeugiBackIcon } from "../design-system/BackIcon";
import { SeugiAddFillIcon } from "../design-system/AddIcon";
export type Tab = SeugiTab;
import { AssignmentsScreen } from "./AssignmentsScreen";
import { TaskCreateScreen } from "./TaskCreateScreen";
import { CatSeugiScreen } from "./CatSeugiScreen";
import { ChatScreen, type ChatImagePreview } from "./ChatScreen";
import { ChatConversationScreen } from "./ChatConversationScreen";
import { ImagePreviewScreen } from "./ImagePreviewScreen";
import { CreateRoomScreen } from "./CreateRoomScreen";
import {
  Home,
  type HomeDetail,
} from "./HomeScreen";
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
import { WorkspaceDetailScreen, type WorkspaceSection } from "./WorkspaceDetailScreen";
import { AccountSettingsScreen } from "./AccountSettingsScreen";
import { WorkspaceGeneralScreen } from "./WorkspaceGeneralScreen";
import { WorkspaceInviteScreen } from "./WorkspaceInviteScreen";
import { WorkspaceNotificationsScreen } from "./WorkspaceNotificationsScreen";
import { absoluteApiUrl } from "../utils/url";
import { markTabVisited, updateTabConversation } from "../utils/tabNavigation";

const tabTitles: Record<SeugiTab, string> = {
  home: "홈",
  chat: "채팅",
  group: "단체",
  notice: "공지",
  profile: "내 프로필",
};
type AppDetail = HomeDetail | "createRoom" | "createGroupRoomName" | "createTask" | "createNotice" | "editNotice" | "accountSettings" | "workspaceJoinCode" | "workspaceJoinConfirm" | "workspaceJoinWaiting" | WorkspaceSection;
const detailTitles: Record<AppDetail, string> = {
  meals: "급식",
  timetable: "시간표",
  tasks: "과제",
  catSeugi: "캣스기",
  workspace: "내 학교",
  createRoom: "멤버 선택",
  createGroupRoomName: "채팅방 이름",
  createTask: "과제 만들기",
  createNotice: "공지 작성",
  editNotice: "공지 수정",
  accountSettings: "설정",
  workspaceGeneral: "일반",
  workspaceMembers: "멤버",
  workspaceInvite: "멤버 초대",
  workspaceNotifications: "알림 설정",
  workspaceCreate: "새 학교 등록",
  workspaceJoin: "학교 가입",
  workspaceJoinCode: "학교 가입",
  workspaceJoinConfirm: "학교 가입",
  workspaceJoinWaiting: "학교 가입",
};

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
  const title = detail ? detailTitles[detail] : activeConversation?.name ?? tabTitles[tab];
  const workspaceJoinRoute = detail === "workspaceJoin" || detail === "workspaceJoinCode" || detail === "workspaceJoinConfirm" || detail === "workspaceJoinWaiting";
  const routeKey = `${tab}:${detailStack.join("/")}:${activeConversation?.id ?? ""}`;

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
      setCanCreateNotice(workspace.ownerId === member.data?.id || (!!profile.data?.role && profile.data.role !== "STUDENT"));
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
          RoomMessagesComponent={RoomMessages}
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
          RoomMessagesComponent={RoomMessages}
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

function TabIcon({ tab, selected }: { tab: Tab; selected: boolean }) {
  const paths: Record<Tab, string[]> = {
    home: ["M10 19V15H14V19C14 19.55 14.45 20 15 20H18C18.55 20 19 19.55 19 19V12H20.7C21.16 12 21.38 11.43 21.03 11.13L12.67 3.6C12.29 3.26 11.71 3.26 11.33 3.6L2.97 11.13C2.63 11.43 2.84 12 3.3 12H5V19C5 19.55 5.45 20 6 20H9C9.55 20 10 19.55 10 19Z"],
    chat: ["M12.5 3C7.253 3 3 7.253 3 12.5C3 17.747 7.253 22 12.5 22H19.125C20.229 22 20.864 20.744 20.21 19.855L19.584 19.004C21.39 17.291 22 15.131 22 12.5C22 7.253 17.747 3 12.5 3ZM7.5 11C7.5 10.448 7.944 10 8.492 10H15.785C16.333 10 16.777 10.448 16.777 11C16.777 11.552 16.333 12 15.785 12H8.492C7.944 12 7.5 11.552 7.5 11ZM9.774 14C9.226 14 8.782 14.448 8.782 15C8.782 15.552 9.226 16 9.774 16H15.785C16.333 16 16.777 15.552 16.777 15C16.777 14.448 16.333 14 15.785 14H9.774Z"],
    group: ["M9.333 9.521C9.333 8.803 9.614 8.114 10.114 7.606C10.194 7.524 10.279 7.449 10.368 7.379C10.832 7.014 11.406 6.813 12 6.813C12.594 6.813 13.168 7.014 13.632 7.379C13.721 7.449 13.806 7.524 13.886 7.606C14.386 8.114 14.667 8.803 14.667 9.521C14.667 9.611 14.662 9.702 14.653 9.791C14.592 10.41 14.323 10.992 13.886 11.436C13.761 11.562 13.625 11.675 13.481 11.773C13.098 12.033 12.654 12.189 12.191 12.222C12.127 12.227 12.064 12.229 12 12.229C11.936 12.229 11.873 12.227 11.809 12.222C11.346 12.189 10.902 12.033 10.519 11.773C10.375 11.675 10.239 11.562 10.114 11.436C9.677 10.992 9.408 10.41 9.347 9.791C9.338 9.702 9.333 9.611 9.333 9.521ZM9.333 13.583C8.449 13.583 7.601 13.94 6.976 14.575C6.351 15.21 6 16.071 6 16.969C6 17.042 6.004 17.115 6.012 17.188C6.06 17.646 6.262 18.076 6.586 18.405C6.961 18.786 7.47 19 8 19H16C16.53 19 17.039 18.786 17.414 18.405C17.738 18.076 17.94 17.646 17.988 17.188C17.996 17.115 18 17.042 18 16.969C18 16.071 17.649 15.21 17.024 14.575C16.399 13.94 15.551 13.583 14.667 13.583H9.333Z", "M5.457 5.793C4.915 6.301 4.611 6.99 4.611 7.708C4.611 8.427 4.915 9.116 5.457 9.623C5.999 10.131 6.734 10.417 7.5 10.417C7.812 10.417 8.12 10.369 8.411 10.279C8.36 10.031 8.333 9.777 8.333 9.521C8.333 8.542 8.716 7.601 9.402 6.904C9.592 6.711 9.802 6.54 10.027 6.395C9.897 6.176 9.735 5.973 9.543 5.793C9.001 5.285 8.266 5 7.5 5C6.734 5 5.999 5.285 5.457 5.793ZM4.611 11.771H9.085C9.182 11.899 9.288 12.022 9.402 12.137C9.565 12.304 9.743 12.453 9.932 12.583H9.333C8.179 12.583 7.075 13.049 6.264 13.873C5.453 14.697 5 15.811 5 16.969C5 17.042 5.003 17.115 5.008 17.188H3.167C2.592 17.188 2.041 16.973 1.635 16.593C1.228 16.212 1 15.695 1 15.156C1 14.258 1.38 13.397 2.058 12.762C2.735 12.127 3.653 11.771 4.611 11.771ZM18.992 17.188H20.833C21.408 17.188 21.959 16.973 22.365 16.593C22.772 16.212 23 15.695 23 15.156C23 14.258 22.619 13.397 21.942 12.762C21.265 12.127 20.347 11.771 19.389 11.771H14.915C14.818 11.899 14.712 12.022 14.598 12.137C14.434 12.304 14.257 12.453 14.068 12.583H14.667C15.821 12.583 16.925 13.049 17.736 13.873C18.547 14.697 19 15.811 19 16.969C19 17.042 18.997 17.115 18.992 17.188ZM13.973 6.395C14.198 6.54 14.408 6.711 14.598 6.904C15.284 7.601 15.667 8.542 15.667 9.521C15.667 9.777 15.64 10.031 15.589 10.279C15.88 10.369 16.188 10.417 16.5 10.417C17.266 10.417 18.001 10.131 18.543 9.623C19.084 9.116 19.389 8.427 19.389 7.708C19.389 6.99 19.084 6.301 18.543 5.793C18.001 5.285 17.266 5 16.5 5C15.734 5 14.999 5.285 14.457 5.793C14.265 5.973 14.103 6.176 13.973 6.395Z"],
    notice: ["M12 3C11.073 3 10.277 3.661 10.108 4.573L10 5.152L9.208 5.221C7.337 5.384 5.833 6.832 5.6 8.696V14.81C5.6 14.862 5.58 14.912 5.544 14.95L4.604 15.919C4.217 16.32 4 16.855 4 17.412C4 18.301 4.721 19.022 5.609 19.022H9.562C9.583 19.022 9.6 19.038 9.6 19.059V19.1C9.6 20.426 10.675 21.5 12 21.5C13.325 21.5 14.4 20.426 14.4 19.1V19.059C14.4 19.038 14.417 19.022 14.438 19.022H19.054C19.576 19.022 20 18.598 20 18.076C20 17.093 19.618 16.149 18.934 15.443L18.456 14.95C18.42 14.912 18.4 14.862 18.4 14.81V8.696C18.167 6.832 16.663 5.384 14.792 5.221L14 5.152L13.892 4.573C13.723 3.661 12.927 3 12 3Z"],
    profile: ["M8 7C8 5.939 8.421 4.922 9.172 4.172C9.922 3.421 10.939 3 12 3C13.061 3 14.078 3.421 14.828 4.172C15.579 4.922 16 5.939 16 7C16 8.061 15.579 9.078 14.828 9.828C14.078 10.579 13.061 11 12 11C10.939 11 9.922 10.579 9.172 9.828C8.421 9.078 8 8.061 8 7ZM8 13C6.674 13 5.402 13.527 4.464 14.465C3.527 15.402 3 16.674 3 18C3 18.796 3.316 19.559 3.879 20.121C4.441 20.684 5.204 21 6 21H18C18.796 21 19.559 20.684 20.121 20.121C20.684 19.559 21 18.796 21 18C21 16.674 20.473 15.402 19.535 14.465C18.598 13.527 17.326 13 16 13H8Z"],
  };
  const color = selected ? SeugiColor.Primary500 : SeugiColor.Gray300;
  return <Svg width={28} height={28} viewBox="0 0 24 24">{paths[tab].map((path) => <Path key={path.slice(0, 12)} d={path} fill={color} fillRule="evenodd" />)}</Svg>;
}

function RoomMessages({
  room,
  onBack,
  onOpenRoom,
  onPreviewImage,
}: {
  room: Parameters<typeof ChatConversationScreen>[0]["room"];
  onBack: () => void;
  onOpenRoom: (room: Room) => void;
  onPreviewImage: (image: ChatImagePreview) => void;
}) {
  return <ChatConversationScreen room={room} onBack={onBack} onOpenRoom={onOpenRoom} onPreviewImage={onPreviewImage} />;
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
  tabbar: {
    height: 62,
    flexDirection: "row",
    paddingHorizontal: 16,
    backgroundColor: SeugiColor.White,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    elevation: 5,
  },
  tab: { flex: 1, justifyContent: "center", alignItems: "center", gap: 1 },
  activeTab: { color: SeugiColor.Primary500, fontWeight: "700" },
  inactiveTab: { color: SeugiColor.Gray300 },
  tabLabelActive: { color: SeugiColor.Primary500, fontSize: 12 },
  tabLabelInactive: { color: SeugiColor.Gray500, fontSize: 12 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
});
