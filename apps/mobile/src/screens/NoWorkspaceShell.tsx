import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, BackHandler, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Room, Workspace } from "@seugi/contracts";
import { SeugiColor } from "@seugi/design-tokens";
import { SeugiBottomNavigation, type SeugiTab } from "../design-system/BottomNavigation";
import { SeugiTopBar } from "../design-system/TopBar";
import { SeugiTextField } from "../design-system/TextField";
import { SeugiProfileSettingsIcon } from "../design-system/ProfileIcons";
import { SeugiSearchIcon } from "../design-system/SearchIcon";
import { SeugiBackIcon } from "../design-system/BackIcon";
import { SeugiAddFillIcon } from "../design-system/AddIcon";
import { AccountSettingsScreen } from "./AccountSettingsScreen";
import { CreateRoomScreen } from "./CreateRoomScreen";
import { NoWorkspaceHome } from "./HomeScreen";
import { ProfileScreen } from "./ProfileScreen";
import { ChatScreen, type ChatImagePreview } from "./ChatScreen";
import { shellTabTitles } from "../navigation/shellNavigation";
import { ChatRoomMessages } from "./shell/ChatRoomMessages";
import { ImagePreviewScreen } from "./ImagePreviewScreen";
import { NoticesScreen } from "./NoticesScreen";
import { WorkspaceMembersScreen } from "./WorkspaceMembersScreen";
import { WorkspaceSetupScreen } from "./WorkspaceSetupScreen";
import { absoluteApiUrl } from "../utils/url";
import { markTabVisited, updateTabConversation } from "../utils/tabNavigation";

const emptyWorkspace: Workspace = { id: "", code: "", name: "", members: [], waitlist: [], ownerId: "" };
type NoWorkspaceDetail = "workspaceMembers" | "createRoom" | "createGroupRoomName";

export function NoWorkspaceShell({
  tab,
  onTabChange,
  onReload,
  onLogout,
  error,
}: {
  tab: SeugiTab;
  onTabChange: (tab: SeugiTab) => void;
  onReload: () => Promise<void>;
  onLogout: () => Promise<void>;
  error?: string;
}) {
  const [setupRoute, setSetupRoute] = useState<"create" | "role" | "requests">();
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [profileRefreshToken, setProfileRefreshToken] = useState(0);
  const [detail, setDetail] = useState<NoWorkspaceDetail>();
  const [memberSearchActive, setMemberSearchActive] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [roomSearchActive, setRoomSearchActive] = useState(false);
  const [roomSearch, setRoomSearch] = useState("");
  const [activeConversations, setActiveConversations] = useState<Partial<Record<SeugiTab, Room>>>({});
  const [visitedTabs, setVisitedTabs] = useState<Set<SeugiTab>>(() => new Set([tab]));
  const activeConversation = activeConversations[tab];
  const updateConversation = useCallback((conversationTab: SeugiTab, room?: Room) => {
    setActiveConversations((current) => updateTabConversation(current, conversationTab, room));
  }, []);
  const updatePersonalConversation = useCallback((room?: Room) => updateConversation("chat", room), [updateConversation]);
  const updateGroupConversation = useCallback((room?: Room) => updateConversation("group", room), [updateConversation]);
  const [activeImagePreview, setActiveImagePreview] = useState<ChatImagePreview>();
  const prompted = useRef(false);
  const showRegistrationPrompt = useCallback(() => {
    const join = { text: "기존 학교 가입", onPress: () => setSetupRoute("role") };
    const create = { text: "새 학교 만들기", onPress: () => setSetupRoute("create") };
    Alert.alert("학교 등록하기", "학교를 등록한 뒤 스기를 사용할 수 있어요", Platform.OS === "android" ? [create, join] : [join, create], { cancelable: Platform.OS === "ios" });
  }, []);
  useEffect(() => {
    if (tab !== "home" || prompted.current) return;
    prompted.current = true;
    showRegistrationPrompt();
  }, [showRegistrationPrompt, tab]);

  useEffect(() => {
    const timer = setInterval(() => { void onReload().catch(() => undefined); }, 10_000);
    return () => clearInterval(timer);
  }, [onReload]);

  useEffect(() => {
    if (!detail) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (memberSearchActive) {
        setMemberSearchActive(false);
        setMemberSearch("");
      } else if (detail === "createGroupRoomName") {
        setDetail("createRoom");
      } else {
        setDetail(undefined);
      }
      return true;
    });
    return () => subscription.remove();
  }, [detail, memberSearchActive]);

  useEffect(() => {
    if (setupRoute || accountSettingsOpen || detail) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!roomSearchActive) return false;
      setRoomSearchActive(false);
      setRoomSearch("");
      return true;
    });
    return () => subscription.remove();
  }, [accountSettingsOpen, detail, roomSearchActive, setupRoute]);

  const backDetail = () => {
    if (memberSearchActive) {
      setMemberSearchActive(false);
      setMemberSearch("");
    } else if (detail === "createGroupRoomName") {
      setDetail("createRoom");
    } else {
      setDetail(undefined);
    }
  };

  return <View style={styles.shell}>
    <SafeAreaView style={styles.page}>
    {!activeConversation ? <SeugiTopBar
      backgroundColor={tab === "home" ? SeugiColor.Primary050 : SeugiColor.White}
      shadow={tab === "chat" || tab === "group"}
      leading={roomSearchActive ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="검색 닫기" onPress={() => { setRoomSearchActive(false); setRoomSearch(""); }}><SeugiBackIcon color={SeugiColor.Gray600} /></TouchableOpacity> : null}
      title={roomSearchActive
        ? <SeugiTextField autoFocus value={roomSearch} onChangeText={setRoomSearch} placeholder="채팅방 검색" returnKeyType="search" fieldStyle={styles.searchField} style={styles.searchInput} />
        : <Text style={styles.title}>{shellTabTitles[tab]}</Text>}
      trailing={tab === "home"
        ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="학교 등록" onPress={showRegistrationPrompt}><SeugiAddFillIcon /></TouchableOpacity>
        : tab === "profile"
          ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="설정" onPress={() => setAccountSettingsOpen(true)}><SeugiProfileSettingsIcon size={28} /></TouchableOpacity>
          : tab === "chat" || tab === "group"
          ? roomSearchActive
            ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="검색 완료" onPress={() => { setRoomSearchActive(false); setRoomSearch(""); }}><Text style={styles.link}>완료</Text></TouchableOpacity>
            : <View style={styles.headerActions}><TouchableOpacity accessibilityRole="button" accessibilityLabel="채팅방 만들기" onPress={() => setDetail(tab === "chat" && Platform.OS === "ios" ? "workspaceMembers" : "createRoom")}><SeugiAddFillIcon /></TouchableOpacity><TouchableOpacity accessibilityRole="button" accessibilityLabel="채팅방 검색" onPress={() => setRoomSearchActive(true)}><SeugiSearchIcon size={24} color={SeugiColor.Primary500} /></TouchableOpacity></View>
          : null}
    /> : null}
    {visitedTabs.has("home") ? <View style={tab === "home" ? styles.tabRoot : styles.hiddenTabRoot} pointerEvents={tab === "home" ? "auto" : "none"}>
      <View style={styles.homePage}>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <NoWorkspaceHome onRegister={showRegistrationPrompt} onRequests={() => setSetupRoute("requests")} />
      </View>
    </View> : null}
    {visitedTabs.has("chat") ? <View style={tab === "chat" ? styles.tabRoot : styles.hiddenTabRoot} pointerEvents={tab === "chat" ? "auto" : "none"}>
      <ChatScreen workspace={emptyWorkspace} roomType="personal" RoomMessagesComponent={ChatRoomMessages} isFocused={tab === "chat"} roomSearch={roomSearch} onConversationChange={updatePersonalConversation} onPreviewImage={setActiveImagePreview} />
    </View> : null}
    {visitedTabs.has("group") ? <View style={tab === "group" ? styles.tabRoot : styles.hiddenTabRoot} pointerEvents={tab === "group" ? "auto" : "none"}>
      <ChatScreen workspace={emptyWorkspace} roomType="group" RoomMessagesComponent={ChatRoomMessages} isFocused={tab === "group"} roomSearch={roomSearch} onConversationChange={updateGroupConversation} onPreviewImage={setActiveImagePreview} />
    </View> : null}
    {visitedTabs.has("notice") ? <View style={tab === "notice" ? styles.tabRoot : styles.hiddenTabRoot} pointerEvents={tab === "notice" ? "auto" : "none"}>
      <NoticesScreen workspace={emptyWorkspace} onCreate={() => undefined} onEdit={() => undefined} />
    </View> : null}
    {visitedTabs.has("profile") ? <View style={tab === "profile" ? styles.tabRoot : styles.hiddenTabRoot} pointerEvents={tab === "profile" ? "auto" : "none"}>
      <ProfileScreen workspace={emptyWorkspace} refreshToken={profileRefreshToken} onOpenSettings={() => setAccountSettingsOpen(true)} />
    </View> : null}
    {!activeConversation ? <SeugiBottomNavigation selected={tab} onSelect={(next) => { setDetail(undefined); setMemberSearchActive(false); setMemberSearch(""); setRoomSearchActive(false); setRoomSearch(""); setVisitedTabs((current) => markTabVisited(current, next)); onTabChange(next); }} /> : null}
    {Platform.OS === "ios" ? <ImagePreviewScreen
      visible={!!activeImagePreview}
      uri={activeImagePreview ? absoluteApiUrl(activeImagePreview.url) : undefined}
      onClose={() => { activeImagePreview?.onClose?.(); setActiveImagePreview(undefined); }}
      onDownload={() => undefined}
      onSend={activeImagePreview?.onSend ? () => { const preview = activeImagePreview; setActiveImagePreview(undefined); preview.onClose?.(); preview.onSend?.(); } : undefined}
    /> : null}
    </SafeAreaView>
    {setupRoute ? <View style={styles.screenOverlay}>
      <WorkspaceSetupScreen
        initialRoute={setupRoute}
        onCreated={onReload}
        onLogout={onLogout}
        error={error}
        onExit={() => setSetupRoute(undefined)}
      />
    </View> : null}
    {accountSettingsOpen ? <View style={styles.screenOverlay}>
      <SafeAreaView style={styles.page}>
        <SeugiTopBar
          leading={<TouchableOpacity accessibilityRole="button" accessibilityLabel="뒤로" onPress={() => setAccountSettingsOpen(false)}><SeugiBackIcon color={SeugiColor.Gray600} /></TouchableOpacity>}
          title={<Text style={styles.title}>설정</Text>}
          trailing={null}
        />
        <AccountSettingsScreen onLogout={onLogout} onProfileUpdated={() => setProfileRefreshToken((current) => current + 1)} />
      </SafeAreaView>
    </View> : null}
    {detail === "workspaceMembers" ? <View style={styles.screenOverlay}>
      <SafeAreaView style={styles.page}>
        <SeugiTopBar
          backgroundColor={SeugiColor.White}
          shadow
          leading={<TouchableOpacity accessibilityRole="button" accessibilityLabel="뒤로" onPress={backDetail}><SeugiBackIcon color={SeugiColor.Gray600} /></TouchableOpacity>}
          title={memberSearchActive
            ? <SeugiTextField autoFocus accessibilityLabel="멤버 검색" value={memberSearch} onChangeText={setMemberSearch} placeholder="멤버 검색" returnKeyType="search" fieldStyle={styles.searchField} style={styles.searchInput} />
            : <Text style={styles.title}>멤버</Text>}
          trailing={<TouchableOpacity accessibilityRole="button" accessibilityLabel={memberSearchActive ? "멤버 검색 닫기" : "멤버 검색"} accessibilityState={{ disabled: Platform.OS !== "ios" }} disabled={Platform.OS !== "ios"} onPress={() => { setMemberSearchActive((active) => !active); setMemberSearch(""); }}>{memberSearchActive ? <Text style={styles.link}>취소</Text> : <SeugiSearchIcon size={24} color={SeugiColor.Gray800} />}</TouchableOpacity>}
        />
        <WorkspaceMembersScreen workspace={emptyWorkspace} search={memberSearch} onOpenRoom={() => setDetail(undefined)} />
      </SafeAreaView>
    </View> : null}
    {detail === "createRoom" || detail === "createGroupRoomName" ? <View style={styles.screenOverlay}>
      <SafeAreaView style={styles.page}>
        <CreateRoomScreen
          workspace={emptyWorkspace}
          step={detail === "createRoom" ? "members" : "name"}
          onNavigate={() => setDetail("createGroupRoomName")}
          onBack={backDetail}
          onCreated={() => setDetail(undefined)}
        />
      </SafeAreaView>
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: SeugiColor.Primary050 },
  page: { flex: 1, backgroundColor: SeugiColor.Primary050 },
  screenOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10, backgroundColor: SeugiColor.Primary050 },
  tabRoot: { flex: 1 },
  hiddenTabRoot: { flex: 1, display: "none" },
  homePage: { flex: 1, backgroundColor: SeugiColor.Primary050 },
  title: { color: SeugiColor.Gray800, fontSize: 18, fontWeight: "700" },
  action: { color: SeugiColor.Primary500, fontSize: 28, lineHeight: 32 },
  back: { color: SeugiColor.Gray600, fontSize: 30, lineHeight: 34 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  searchField: { height: 40, borderWidth: 0, backgroundColor: "transparent", paddingHorizontal: 0 },
  searchInput: { fontSize: 16 },
  message: { color: SeugiColor.Gray500, fontSize: 14 },
  error: { color: SeugiColor.Red500, fontSize: 13 },
  link: { color: SeugiColor.Primary500, fontSize: 14, fontWeight: "600" },
  emptyText: { color: SeugiColor.Gray600, fontSize: 15 },
});
