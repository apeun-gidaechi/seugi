import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, BackHandler, FlatList, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { LegacyProfile, Member, Room } from "@seugi/contracts";
import { Button, Card } from "./ui";
import { ChatInviteScreen } from "../screens/ChatInviteScreen";
import { SeugiAvatar } from "../design-system/Avatar";
import { api } from "../services/api";
import { absoluteApiUrl } from "../utils/url";

export function ChatRoomManagement({ room, memberId, onRoomChange, onLeave, onOpenPersonalChat }: { room: Room; memberId: string; onRoomChange: (room: Room) => void; onLeave: () => void; onOpenPersonalChat: (room: Room) => void }) {
  const [workspaceMembers, setWorkspaceMembers] = useState<Member[]>([]); const [selectedIds, setSelectedIds] = useState<string[]>([]); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false); const [inviting, setInviting] = useState(false); const isAdmin = room.adminId === memberId;
  const [profile, setProfile] = useState<LegacyProfile>();
  useEffect(() => {
    if (!inviting) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setInviting(false);
      setSelectedIds([]);
      return true;
    });
    return () => subscription.remove();
  }, [inviting]);
  const onRoomChangeRef = useRef(onRoomChange);
  onRoomChangeRef.current = onRoomChange;
  const refresh = useCallback(async () => { const [updated, members] = await Promise.all([api.groupRoom(room.id), api.workspaceMembers(room.workspaceId)]); if (updated.data) onRoomChangeRef.current(updated.data); setWorkspaceMembers(members.data ?? []); }, [room.id, room.workspaceId]);
  useEffect(() => { refresh().catch((e) => setNotice(e instanceof Error ? e.message : "구성원 정보를 불러오지 못했습니다")); }, [refresh]);
  const run = async (action: () => Promise<unknown>) => { if (busy) return false; setBusy(true); setNotice(""); try { await action(); setSelectedIds([]); await refresh(); return true; } catch (e) { setNotice(e instanceof Error ? e.message : "채팅방을 변경하지 못했습니다"); return false; } finally { setBusy(false); } };
  const leave = () => Alert.alert("채팅방 나가기", "이 채팅방에서 나갈까요?", [{ text: "취소", style: "cancel" }, { text: "나가기", style: "destructive", onPress: () => { void run(async () => { await api.leaveGroupRoom(room.id); onLeave(); }); } }]);
  const openProfile = async (id: string) => {
    if (id === memberId) return;
    try { const result = await api.profileOfOther(room.workspaceId, id); setProfile(result.data); }
    catch (error) { setNotice(error instanceof Error ? error.message : "프로필을 불러오지 못했습니다"); }
  };
  const startPersonalChat = async () => {
    if (!profile || busy) return;
    setBusy(true); setNotice("");
    try {
      const created = await api.createRoom("personal", { workspaceId: room.workspaceId, name: "", memberIds: [profile.member.id] });
      if (!created.data) throw new Error("채팅방을 열지 못했습니다");
      const result = await api.personalRoom(created.data);
      if (!result.data) throw new Error("채팅방 정보를 불러오지 못했습니다");
      setProfile(undefined); onOpenPersonalChat(result.data);
    } catch (error) { setNotice(error instanceof Error ? error.message : "개인 채팅을 시작하지 못했습니다"); }
    finally { setBusy(false); }
  };
  const byId = new Map(workspaceMembers.map((member) => [member.id, member]));
  const candidates = workspaceMembers.filter((member) => !room.memberIds.includes(member.id));
  if (inviting) return <ChatInviteScreen
    members={candidates}
    selectedIds={selectedIds}
    busy={busy}
    notice={notice}
    onBack={() => { setInviting(false); setSelectedIds([]); }}
    onToggle={(id) => setSelectedIds((current) => current.includes(id) ? current.filter((selected) => selected !== id) : [...current, id])}
    onComplete={() => { void run(() => api.addGroupMembers(room.id, selectedIds)).then((success) => { if (success) setInviting(false); }); }}
  />;
  return <><FlatList style={styles.content} data={room.memberIds} keyExtractor={(id) => id} ListHeaderComponent={<Card title="채팅방 구성원"><Text>{room.memberIds.length}명 · {isAdmin ? "방장" : "구성원"}</Text><Button label="멤버 초대" kind="secondary" onPress={() => { setNotice(""); setInviting(true); }} />{notice ? <Text style={styles.error}>{notice}</Text> : null}<Button label="채팅방 나가기" kind="secondary" onPress={leave} disabled={busy} /></Card>} renderItem={({ item: id }) => <View style={styles.row}><TouchableOpacity accessibilityRole="button" disabled={id === memberId} onPress={() => void openProfile(id)}><Text style={styles.rowTitle}>{byId.get(id)?.name ?? "구성원"}{id === room.adminId ? " · 방장" : ""}</Text><Text style={styles.muted}>{id === memberId ? "나" : "프로필 보기 ›"}</Text></TouchableOpacity>{isAdmin && id !== room.adminId ? <View style={styles.memberActions}><TouchableOpacity disabled={busy} onPress={() => run(() => api.transferGroupAdmin(room.id, id))}><Text style={styles.link}>방장 위임</Text></TouchableOpacity><TouchableOpacity disabled={busy} onPress={() => run(() => api.removeGroupMembers(room.id, [id]))}><Text style={styles.error}>내보내기</Text></TouchableOpacity></View> : null}</View>} /><Modal visible={!!profile} transparent animationType="slide" onRequestClose={() => setProfile(undefined)}><View style={styles.profileBackdrop}><TouchableOpacity style={styles.profileDismiss} activeOpacity={1} onPress={() => setProfile(undefined)} /><View style={styles.profileSheet}><View style={styles.profileHeader}><SeugiAvatar uri={profile?.member.picture ? absoluteApiUrl(profile.member.picture) : undefined} name={profile?.member.name} imageStyle={styles.avatar} fallbackStyle={styles.avatarPlaceholder} labelStyle={styles.link} /><View style={{ flex: 1 }}><Text style={styles.profileName}>{profile?.member.name}{profile?.nick ? ` (${profile.nick})` : ""}</Text><Text style={styles.muted}>{profile?.permission === "ADMIN" ? "관리자" : profile?.permission === "MIDDLE_ADMIN" ? "중간관리자" : profile?.permission === "TEACHER" ? "선생님" : "학생"}</Text></View><TouchableOpacity accessibilityRole="button" onPress={() => setProfile(undefined)}><Text style={styles.link}>닫기</Text></TouchableOpacity></View>{[["상태 메시지", profile?.status], ["학년·반·번호", [profile?.grade, profile?.class, profile?.number].filter(Boolean).join(" · ")], ["직위", profile?.spot], ["소속", profile?.belong], ["휴대전화", profile?.phone], ["유선전화", profile?.wire], ["근무 위치", profile?.location]].filter((row) => row[1]).map(([label, value]) => <View key={String(label)} style={styles.profileField}><Text style={styles.muted}>{label}</Text><Text style={styles.rowTitle}>{value}</Text></View>)}<Button label={busy ? "여는 중…" : "개인 채팅 시작"} onPress={() => void startPersonalChat()} disabled={busy} /></View></View></Modal></>;
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 16 },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  rowTitle: { fontWeight: "600" },
  row: { backgroundColor: SeugiColor.White, padding: 16, marginBottom: 8, borderRadius: 12, flexDirection: "row", justifyContent: "space-between" },
  memberActions: { flexDirection: "row", gap: 14 },
  link: { color: SeugiColor.Primary500 },
  empty: { textAlign: "center", color: SeugiColor.Gray500, padding: 24 },
  profileBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.32)" },
  profileDismiss: { flex: 1 },
  profileSheet: { backgroundColor: SeugiColor.White, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, gap: 10 },
  profileHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 12 },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  avatarPlaceholder: { width: 54, height: 54, borderRadius: 27, backgroundColor: SeugiColor.Primary100, alignItems: "center", justifyContent: "center" },
  profileName: { color: SeugiColor.Gray800, fontWeight: "700", fontSize: 18 },
  profileField: { borderTopWidth: 1, borderColor: SeugiColor.Gray100, paddingTop: 10, gap: 4 },
});
