import { useCallback, useEffect, useRef, useState } from "react";
import { ActionSheetIOS, ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { SeugiColor } from "@seugi/design-tokens";
import type { LegacyProfile, Role, Room, Workspace, WorkspaceMemberView } from "@seugi/contracts";
import { SeugiButton } from "../components/ui";
import { SeugiSegmentedControl } from "../design-system/SegmentedControl";
import { api } from "../services/api";
import { authPrimaryButtonProps } from "../utils/authButton";
import { absoluteApiUrl } from "../utils/url";
import { workspaceMemberActionAvailability } from "../utils/workspaceMemberActions";
import { SeugiAvatar } from "../design-system/Avatar";
import { SeugiEmptyState } from "../design-system/EmptyState";
import { SeugiShimmer } from "../design-system/Shimmer";
import { SeugiCrownIcon } from "../design-system/NativeIndicators";
import { StudentInfoScreen } from "./StudentInfoScreen";
import { workspaceMembersLoadFailureState } from "../utils/workspaceMembersLoad";
import { workspaceMemberProfileHeader, workspaceMemberProfileRows } from "../utils/workspaceMemberProfile";
import { workspaceMemberProfileModel } from "../utils/workspaceMemberProfileModel";
import { workspaceMemberChatFailureFeedback } from "../utils/workspaceMemberChatFeedback";
import { matchesIosKoreanPrefixSearch } from "../utils/koreanSearch.ts";

export function WorkspaceMembersScreen({ workspace, search, onOpenRoom }: { workspace: Workspace; search: string; onOpenRoom: (room: Room) => void }) {
  const [members, setMembers] = useState<WorkspaceMemberView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [actorRole, setActorRole] = useState<Role>("STUDENT");
  const [tab, setTab] = useState<"TEACHER" | "STUDENT">("TEACHER");
  const [memberFilterExpanded, setMemberFilterExpanded] = useState(false);
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [selected, setSelected] = useState<LegacyProfile>();
  const [openingChat, setOpeningChat] = useState(false);
  const [canManageMembers, setCanManageMembers] = useState(false);
  const [editingStudentInfo, setEditingStudentInfo] = useState(false);
  const [chatFailureNotice, setChatFailureNotice] = useState("");
  const membersAvailable = useRef(false);
  const chatFailureTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const refresh = useCallback(async () => {
    if (Platform.OS === "ios" || !membersAvailable.current) setLoading(true);
    setLoadFailed(false);
    try {
      const [result, info, profile] = await Promise.all([
        api.workspaceMembers(workspace.id),
        Platform.OS === "ios" ? api.memberInfo().catch(() => undefined) : Promise.resolve(undefined),
        Platform.OS === "ios" ? api.myProfile(workspace.id).catch(() => undefined) : Promise.resolve(undefined),
      ]);
      if (Platform.OS === "ios") {
        const owner = info?.data?.id === workspace.ownerId;
        const role = owner ? "ADMIN" : profile?.data?.role ?? "STUDENT";
        setIsOwner(owner);
        setActorRole(role);
        setCanManageMembers(owner || role === "ADMIN" || role === "MIDDLE_ADMIN");
      }
      const roleOrder: Record<Role, number> = { STUDENT: 0, TEACHER: 1, MIDDLE_ADMIN: 2, ADMIN: 3 };
      const nextMembers = (result.data ?? []).map((member) => ({ ...member, role: member.id === workspace.ownerId ? "ADMIN" as const : member.role ?? "STUDENT" as const }));
      membersAvailable.current = nextMembers.length > 0;
      setMembers(Platform.OS === "ios" ? nextMembers.sort((left, right) => roleOrder[right.role ?? "STUDENT"] - roleOrder[left.role ?? "STUDENT"]) : nextMembers);
      setLoading(false);
      return nextMembers;
    } catch (error) {
      const failureState = workspaceMembersLoadFailureState(Platform.OS === "ios" ? "ios" : "android", membersAvailable.current);
      setLoading(failureState.loading);
      setLoadFailed(failureState.loadFailed);
      throw error;
    }
  }, [workspace.id, workspace.ownerId]);
  useEffect(() => { refresh().catch(() => undefined); }, [refresh]);
  useEffect(() => () => clearTimeout(chatFailureTimeout.current), []);

  const visibleMembers = members.filter((member) =>
    (tab === "STUDENT" ? member.role === "STUDENT" : member.role !== "STUDENT") &&
    (Platform.OS === "ios"
      ? matchesIosKoreanPrefixSearch(member.nick ? `${member.name} (${member.nick})` : member.name, search)
      : member.name.toLowerCase().includes(search.trim().toLowerCase())),
  );
  const roleLabel = (role?: Role) => role === "ADMIN" ? "관리자" : role === "MIDDLE_ADMIN" ? "중간관리자" : role === "TEACHER" ? "교사" : "학생";
  const openProfile = (member: WorkspaceMemberView) => {
    setNotice("");
    setSelected(workspaceMemberProfileModel(member));
  };
  const updateRole = async (member: WorkspaceMemberView, role: Role) => {
    if (busyId) return;
    setBusyId(member.id); setNotice("");
    try { await api.setWorkspaceMemberRole(workspace.id, member.id, role); await refresh(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "권한을 변경하지 못했습니다"); }
    finally { setBusyId(""); }
  };
  const removeMember = (member: WorkspaceMemberView) => Alert.alert("구성원 내보내기", `${member.name}님을 워크스페이스에서 내보낼까요?`, [
    { text: "취소", style: "cancel" },
    { text: "내보내기", style: "destructive", onPress: () => { void (async () => {
      setBusyId(member.id); setNotice("");
      try { await api.removeWorkspaceMember(workspace.id, member.id); await refresh(); }
      catch (error) { setNotice(error instanceof Error ? error.message : "구성원을 내보내지 못했습니다"); }
      finally { setBusyId(""); }
    })(); } },
  ]);
  const openMemberActions = (member: WorkspaceMemberView) => {
    if (Platform.OS !== "ios") return;
    const availability = workspaceMemberActionAvailability({
      actorRole,
      memberRole: member.role ?? "STUDENT",
      isOwner,
      isOwnerTarget: member.id === workspace.ownerId,
      canManageMembers,
    });
    const actions = [
      { title: "부관리자 임명", enabled: availability.promote, run: () => void updateRole(member, "MIDDLE_ADMIN") },
      { title: "학생 정보 수정", enabled: availability.editStudentInfo, run: () => {
        setSelected(workspaceMemberProfileModel(member));
        setEditingStudentInfo(true);
      } },
      { title: "내보내기", enabled: availability.remove, run: () => removeMember(member) },
    ];
    const options = [...actions.map((action) => action.title), "취소"];
    ActionSheetIOS.showActionSheetWithOptions({
      options,
      cancelButtonIndex: options.length - 1,
      destructiveButtonIndex: 2,
      disabledButtonIndices: actions.flatMap((action, index) => action.enabled ? [] : [index]),
    }, (index) => actions[index]?.enabled && actions[index].run());
  };
  const startPersonalChat = async () => {
    if (!selected || openingChat) return;
    setOpeningChat(true); setNotice("");
    setChatFailureNotice("");
    clearTimeout(chatFailureTimeout.current);
    try {
      const created = await api.createRoom("personal", { workspaceId: workspace.id, name: "", memberIds: [selected.member.id] });
      if (!created.data) throw new Error("채팅방을 만들지 못했습니다");
      const result = await api.personalRoom(created.data);
      if (!result.data) throw new Error("채팅방을 불러오지 못했습니다");
      setSelected(undefined); onOpenRoom(result.data);
    } catch {
      const feedback = workspaceMemberChatFailureFeedback(Platform.OS === "ios" ? "ios" : "android");
      if (feedback.kind === "snackbar") {
        setChatFailureNotice(feedback.message);
        chatFailureTimeout.current = setTimeout(() => setChatFailureNotice(""), 4000);
      }
    }
    finally { setOpeningChat(false); }
  };

  return <View style={styles.screen}>
    <View style={styles.tabs}><SeugiSegmentedControl value={tab} options={[{ value: "TEACHER", label: "선생님" }, { value: "STUDENT", label: "학생" }]} onChange={setTab} variant="nativeTabs" /></View>
    {Platform.OS === "android" ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="멤버 분류: 전체" accessibilityState={{ expanded: memberFilterExpanded }} onPress={() => setMemberFilterExpanded((expanded) => !expanded)} style={styles.memberFilter}>
      <Text style={styles.memberFilterLabel}>전체</Text>
      <Svg width={24} height={24} viewBox="0 0 24 24"><Path fill={SeugiColor.Gray800} d={memberFilterExpanded ? "m7.41 15.41 4.59-4.58 4.59 4.58L18 14l-6-6-6 6z" : "m7.41 8.59 4.59 4.58 4.59-4.58L18 10l-6 6-6-6z"} /></Svg>
    </TouchableOpacity> : null}
    <ScrollView contentContainerStyle={styles.list}>
      {loadFailed && Platform.OS === "ios" ? <SeugiEmptyState title="불러올 수 없어요" style={styles.emptyState} /> : loading ? Platform.OS === "android" ? <View accessibilityLabel="멤버 목록 불러오는 중" style={styles.loadingRows}>
        {Array.from({ length: 3 }, (_, index) => <View key={index} style={styles.loadingMember}>
          <SeugiShimmer style={styles.loadingAvatar} />
          <SeugiShimmer style={styles.loadingName} />
        </View>)}
      </View> : <ActivityIndicator color={SeugiColor.Primary500} style={styles.loading} /> : null}
      {!loading && !notice && visibleMembers.length === 0 && Platform.OS === "ios" ? <SeugiEmptyState title="멤버가 없어요" style={styles.emptyState} /> : null}
      {!loading ? visibleMembers.map((member) => <View key={member.id} style={styles.member}>
        <TouchableOpacity accessibilityRole="button" onPress={() => void openProfile(member)} style={styles.identity}>
          <SeugiAvatar uri={member.picture ? absoluteApiUrl(member.picture) : undefined} name={member.name} imageStyle={styles.avatar} fallbackStyle={styles.avatarFallback} labelStyle={styles.avatarInitial} />
          <View style={styles.identityText}><Text style={styles.name}>{member.name}</Text><Text style={styles.role}>{roleLabel(member.role)}</Text></View>
          {member.role === "ADMIN" || member.role === "MIDDLE_ADMIN" ? <SeugiCrownIcon color={SeugiColor.Orange500} size={18} /> : null}
        </TouchableOpacity>
        {Platform.OS === "ios" ? <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${member.name} 구성원 메뉴`} onPress={() => openMemberActions(member)} style={styles.memberMenu}><Text style={styles.action}>⋮</Text></TouchableOpacity> : null}
      </View>) : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </ScrollView>
    <Modal visible={!!selected && !editingStudentInfo} transparent animationType="slide" onRequestClose={() => setSelected(undefined)}>
      <View style={styles.backdrop}><TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={() => setSelected(undefined)} /><View style={styles.sheet}>
        <View style={styles.profileHeader}>
          <SeugiAvatar uri={selected?.member.picture ? absoluteApiUrl(selected.member.picture) : undefined} name={selected?.member.name} imageStyle={styles.profileAvatar} fallbackStyle={styles.profileAvatarFallback} labelStyle={styles.avatarInitial} />
          <View style={styles.identityText}><Text style={styles.profileName}>{selected ? workspaceMemberProfileHeader(Platform.OS === "ios" ? "ios" : "android", { name: selected.member.name, nick: selected.nick }) : ""}</Text></View>
        </View>
        {selected ? workspaceMemberProfileRows(Platform.OS === "ios" ? "ios" : "android", selected).map(({ label, value }) => <View key={label} style={styles.profileField}><Text style={styles.role}>{label}</Text><Text style={styles.profileValue}>{value}</Text></View>) : null}
        <SeugiButton label="채팅" onPress={() => void startPersonalChat()} variant="black" disabled={openingChat} loading={openingChat} {...authPrimaryButtonProps(Platform.OS === "ios" ? "ios" : "android")} />
      </View>
      {chatFailureNotice && Platform.OS === "android" ? <View accessibilityRole="alert" style={styles.snackbar}><Text style={styles.snackbarText}>{chatFailureNotice}</Text></View> : null}
      </View>
    </Modal>
    {selected ? <StudentInfoScreen visible={editingStudentInfo} workspace={workspace} profile={selected} onClose={(saved) => {
      setEditingStudentInfo(false);
      if (saved) void refresh().then((nextMembers) => {
        const updated = nextMembers.find((member) => member.id === selected.member.id);
        if (updated) setSelected(workspaceMemberProfileModel(updated));
      }).catch((error) => setNotice(error instanceof Error ? error.message : "수정된 학생 정보를 불러오지 못했습니다"));
    }} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SeugiColor.White },
  tabs: { marginHorizontal: 20, marginTop: 6 },
  memberFilter: { minHeight: 24, flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 8, marginLeft: 24, marginTop: 16, marginBottom: 16 },
  memberFilterLabel: { color: SeugiColor.Gray800, fontSize: 16, fontWeight: "600" },
  list: { paddingHorizontal: 4, paddingTop: 12, paddingBottom: 24 },
  loading: { padding: 24 },
  loadingRows: { paddingTop: 12 },
  loadingMember: { height: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 16 },
  loadingAvatar: { width: 36, height: 36, borderRadius: 18 },
  loadingName: { width: 52, height: 21, borderRadius: 12 },
  member: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: SeugiColor.Gray100 },
  identity: { flex: 1, minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12 },
  identityText: { flex: 1, gap: 4 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: SeugiColor.Gray100 },
  avatarFallback: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: SeugiColor.Primary100 },
  avatarInitial: { color: SeugiColor.Primary500, fontWeight: "700", fontSize: 16 },
  name: { color: SeugiColor.Gray800, fontWeight: "600", fontSize: 15 },
  role: { color: SeugiColor.Gray500, fontSize: 12 },
  memberMenu: { width: 32, height: 40, alignItems: "center", justifyContent: "center" },
  action: { color: SeugiColor.Primary500, fontSize: 13 },
  remove: { color: SeugiColor.Red500, fontSize: 12 },
  emptyState: { paddingTop: 32 },
  notice: { color: SeugiColor.Red500, textAlign: "center", padding: 12 },
  snackbar: { position: "absolute", left: 16, right: 16, bottom: 16, minHeight: 48, justifyContent: "center", backgroundColor: SeugiColor.Gray800, borderRadius: 4, paddingHorizontal: 16, elevation: 6 },
  snackbarText: { color: SeugiColor.White, fontSize: 14 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.32)" },
  dismiss: { flex: 1 },
  sheet: { backgroundColor: SeugiColor.White, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, gap: 12 },
  profileHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 12 },
  profileAvatar: { width: 32, height: 32, borderRadius: 16 },
  profileAvatarFallback: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: SeugiColor.Primary100 },
  profileName: { color: SeugiColor.Gray800, fontWeight: "700", fontSize: 18 },
  profileField: { borderTopWidth: 1, borderColor: SeugiColor.Gray100, paddingTop: 10, gap: 4 },
  profileValue: { color: SeugiColor.Gray800, fontSize: 14 },
});
