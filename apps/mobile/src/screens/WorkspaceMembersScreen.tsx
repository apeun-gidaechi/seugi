import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { LegacyProfile, Member, Role, Room, Workspace } from "@seugi/contracts";
import { Button } from "../components/ui";
import { SeugiTextField } from "../design-system/TextField";
import { api } from "../services/api";
import { absoluteApiUrl } from "../utils/url";
import { SeugiAvatar } from "../design-system/Avatar";
import { StudentInfoScreen } from "./StudentInfoScreen";

export function WorkspaceMembersScreen({ workspace, onOpenRoom }: { workspace: Workspace; onOpenRoom: (room: Room) => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [tab, setTab] = useState<"TEACHER" | "STUDENT">("TEACHER");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");
  const [selected, setSelected] = useState<LegacyProfile>();
  const [openingChat, setOpeningChat] = useState(false);
  const [canManageMembers, setCanManageMembers] = useState(false);
  const [editingStudentInfo, setEditingStudentInfo] = useState(false);
  const [search, setSearch] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [info, result, profile] = await Promise.all([api.memberInfo(), api.workspaceMembers(workspace.id), api.myProfile(workspace.id)]);
      setIsOwner(info.data?.id === workspace.ownerId);
      setCanManageMembers(info.data?.id === workspace.ownerId || profile.data?.role === "ADMIN" || profile.data?.role === "MIDDLE_ADMIN");
      setMembers((result.data ?? []).map((member) => ({ ...member, role: member.id === workspace.ownerId ? "ADMIN" : member.role ?? "STUDENT" })));
    } finally {
      setLoading(false);
    }
  }, [workspace.id, workspace.ownerId]);
  useEffect(() => { refresh().catch((error) => setNotice(error instanceof Error ? error.message : "구성원 목록을 불러오지 못했습니다")); }, [refresh]);

  const visibleMembers = members.filter((member) =>
    (tab === "STUDENT" ? member.role === "STUDENT" : member.role !== "STUDENT") &&
    member.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const roleLabel = (role?: Role) => role === "ADMIN" ? "관리자" : role === "MIDDLE_ADMIN" ? "중간관리자" : role === "TEACHER" ? "교사" : "학생";
  const openProfile = async (member: Member) => {
    setNotice("");
    try { const result = await api.profileOfOther(workspace.id, member.id); setSelected(result.data); }
    catch (error) { setNotice(error instanceof Error ? error.message : "멤버 정보를 불러오지 못했습니다"); }
  };
  const updateRole = async (member: Member, role: Role) => {
    if (busyId) return;
    setBusyId(member.id); setNotice("");
    try { await api.setWorkspaceMemberRole(workspace.id, member.id, role); await refresh(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "권한을 변경하지 못했습니다"); }
    finally { setBusyId(""); }
  };
  const removeMember = (member: Member) => Alert.alert("구성원 내보내기", `${member.name}님을 워크스페이스에서 내보낼까요?`, [
    { text: "취소", style: "cancel" },
    { text: "내보내기", style: "destructive", onPress: () => { void (async () => {
      setBusyId(member.id); setNotice("");
      try { await api.removeWorkspaceMember(workspace.id, member.id); await refresh(); }
      catch (error) { setNotice(error instanceof Error ? error.message : "구성원을 내보내지 못했습니다"); }
      finally { setBusyId(""); }
    })(); } },
  ]);
  const startPersonalChat = async () => {
    if (!selected || openingChat) return;
    setOpeningChat(true); setNotice("");
    try {
      const created = await api.createRoom("personal", { workspaceId: workspace.id, name: "", memberIds: [selected.member.id] });
      if (!created.data) throw new Error("채팅방을 만들지 못했습니다");
      const result = await api.personalRoom(created.data);
      if (!result.data) throw new Error("채팅방을 불러오지 못했습니다");
      setSelected(undefined); onOpenRoom(result.data);
    } catch (error) { setNotice(error instanceof Error ? error.message : "개인 채팅을 열지 못했습니다"); }
    finally { setOpeningChat(false); }
  };

  return <View style={styles.screen}>
    <View style={styles.tabs}>{(["TEACHER", "STUDENT"] as const).map((value) => <TouchableOpacity key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => setTab(value)} style={[styles.tab, tab === value && styles.tabSelected]}><Text style={tab === value ? styles.tabLabelSelected : styles.tabLabel}>{value === "TEACHER" ? "선생님" : "학생"}</Text></TouchableOpacity>)}</View>
    <SeugiTextField accessibilityLabel="멤버 검색" value={search} onChangeText={setSearch} placeholder="멤버 검색" containerStyle={styles.search} fieldStyle={styles.searchField} />
    <ScrollView contentContainerStyle={styles.list}>
      {loading ? <ActivityIndicator color={SeugiColor.Primary500} style={styles.loading} /> : null}
      {!loading && !notice && visibleMembers.length === 0 ? <Text style={styles.empty}>{search.trim() ? "검색 결과가 없어요" : "멤버가 없어요"}</Text> : null}
      {!loading ? visibleMembers.map((member) => <View key={member.id} style={styles.member}>
        <TouchableOpacity accessibilityRole="button" onPress={() => void openProfile(member)} style={styles.identity}>
          <SeugiAvatar uri={member.picture ? absoluteApiUrl(member.picture) : undefined} name={member.name} imageStyle={styles.avatar} fallbackStyle={styles.avatarFallback} labelStyle={styles.avatarInitial} />
          <View style={styles.identityText}><Text style={styles.name}>{member.name}</Text><Text style={styles.role}>{roleLabel(member.role)}</Text></View>
          {member.role === "ADMIN" || member.role === "MIDDLE_ADMIN" ? <Text style={styles.crown}>♛</Text> : null}
        </TouchableOpacity>
        {isOwner && member.id !== workspace.ownerId ? <View style={styles.actions}>
          {(["STUDENT", "TEACHER", "MIDDLE_ADMIN"] as const).map((role) => <TouchableOpacity key={role} disabled={!!busyId} onPress={() => void updateRole(member, role)}><Text style={member.role === role ? styles.selectedRole : styles.action}>{role === "STUDENT" ? "학생" : role === "TEACHER" ? "교사" : "관리자"}</Text></TouchableOpacity>)}
          <TouchableOpacity disabled={!!busyId} onPress={() => removeMember(member)}><Text style={styles.remove}>내보내기</Text></TouchableOpacity>
        </View> : null}
      </View>) : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </ScrollView>
    <Modal visible={!!selected && !editingStudentInfo} transparent animationType="slide" onRequestClose={() => setSelected(undefined)}>
      <View style={styles.backdrop}><TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={() => setSelected(undefined)} /><View style={styles.sheet}>
        <View style={styles.profileHeader}>
          <SeugiAvatar uri={selected?.member.picture ? absoluteApiUrl(selected.member.picture) : undefined} name={selected?.member.name} imageStyle={styles.profileAvatar} fallbackStyle={styles.profileAvatarFallback} labelStyle={styles.avatarInitial} />
          <View style={styles.identityText}><Text style={styles.profileName}>{selected?.member.name}</Text><Text style={styles.role}>{selected ? roleLabel(selected.permission) : ""}</Text></View>
          <TouchableOpacity onPress={() => setSelected(undefined)}><Text style={styles.action}>닫기</Text></TouchableOpacity>
        </View>
        {[["상태 메시지", selected?.status], ["학년·반·번호", selected ? [selected.schGrade ?? selected.grade, selected.schClass ?? selected.class, selected.schNumber ?? selected.number].filter(Boolean).join(" · ") : ""], ["직위", selected?.spot], ["소속", selected?.belong], ["휴대전화", selected?.phone], ["유선전화", selected?.wire], ["근무 위치", selected?.location]].filter((row) => row[1]).map(([label, value]) => <View key={String(label)} style={styles.profileField}><Text style={styles.role}>{label}</Text><Text style={styles.profileValue}>{value}</Text></View>)}
        {canManageMembers && selected?.permission === "STUDENT" ? <Button label="학생 정보 수정" kind="secondary" onPress={() => setEditingStudentInfo(true)} /> : null}
        <Button label={openingChat ? "채팅방 여는 중…" : "개인 채팅"} onPress={() => void startPersonalChat()} disabled={openingChat} />
      </View></View>
    </Modal>
    {selected ? <StudentInfoScreen visible={editingStudentInfo} workspace={workspace} profile={selected} onClose={(saved) => {
      setEditingStudentInfo(false);
      if (saved) void api.profileOfOther(workspace.id, selected.member.id).then((result) => setSelected(result.data)).catch((error) => setNotice(error instanceof Error ? error.message : "수정된 학생 정보를 불러오지 못했습니다"));
    }} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SeugiColor.White },
  tabs: { height: 48, marginHorizontal: 20, marginTop: 6, padding: 4, borderRadius: 12, flexDirection: "row", backgroundColor: SeugiColor.Gray100 },
  search: { marginHorizontal: 20, marginTop: 12 },
  searchField: { minHeight: 44, height: 44, borderRadius: 12 },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 9 },
  tabSelected: { backgroundColor: SeugiColor.White },
  tabLabel: { color: SeugiColor.Gray500, fontSize: 14 },
  tabLabelSelected: { color: SeugiColor.Primary500, fontSize: 14, fontWeight: "700" },
  list: { paddingHorizontal: 4, paddingTop: 12, paddingBottom: 24 },
  loading: { padding: 24 },
  member: { paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: SeugiColor.Gray100 },
  identity: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12 },
  identityText: { flex: 1, gap: 4 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: SeugiColor.Gray100 },
  avatarFallback: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: SeugiColor.Primary100 },
  avatarInitial: { color: SeugiColor.Primary500, fontWeight: "700", fontSize: 16 },
  name: { color: SeugiColor.Gray800, fontWeight: "600", fontSize: 15 },
  role: { color: SeugiColor.Gray500, fontSize: 12 },
  crown: { color: SeugiColor.Orange500, fontSize: 18 },
  actions: { flexDirection: "row", alignItems: "center", gap: 14, paddingLeft: 56 },
  selectedRole: { color: SeugiColor.Primary500, fontWeight: "700", fontSize: 12 },
  action: { color: SeugiColor.Primary500, fontSize: 13 },
  remove: { color: SeugiColor.Red500, fontSize: 12 },
  empty: { color: SeugiColor.Gray500, textAlign: "center", padding: 32 },
  notice: { color: SeugiColor.Red500, textAlign: "center", padding: 12 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.32)" },
  dismiss: { flex: 1 },
  sheet: { backgroundColor: SeugiColor.White, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, gap: 12 },
  profileHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 12 },
  profileAvatar: { width: 32, height: 32, borderRadius: 16 },
  profileAvatarFallback: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", backgroundColor: SeugiColor.Primary100 },
  profileName: { color: SeugiColor.Gray800, fontWeight: "700", fontSize: 18 },
  profileField: { borderTopWidth: 1, borderColor: SeugiColor.Gray100, paddingTop: 10, gap: 4 },
  profileValue: { color: SeugiColor.Gray800, fontSize: 14 },
});
