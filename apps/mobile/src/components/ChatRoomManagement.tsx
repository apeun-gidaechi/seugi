import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { Member, Room } from "@seugi/contracts";
import { Button, Card } from "./ui";
import { api } from "../services/api";

export function ChatRoomManagement({ room, memberId, onRoomChange, onLeave }: { room: Room; memberId: string; onRoomChange: (room: Room) => void; onLeave: () => void }) {
  const [workspaceMembers, setWorkspaceMembers] = useState<Member[]>([]); const [selectedIds, setSelectedIds] = useState<string[]>([]); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false); const [inviting, setInviting] = useState(false); const isAdmin = room.adminId === memberId;
  const refresh = useCallback(async () => { const [updated, members] = await Promise.all([api.groupRoom(room.id), api.workspaceMembers(room.workspaceId)]); onRoomChange(updated.data ?? room); setWorkspaceMembers(members.data ?? []); }, [room.id, room.workspaceId, onRoomChange]);
  useEffect(() => { refresh().catch((e) => setNotice(e instanceof Error ? e.message : "구성원 정보를 불러오지 못했습니다")); }, [refresh]);
  const run = async (action: () => Promise<unknown>) => { if (busy) return false; setBusy(true); setNotice(""); try { await action(); setSelectedIds([]); await refresh(); return true; } catch (e) { setNotice(e instanceof Error ? e.message : "채팅방을 변경하지 못했습니다"); return false; } finally { setBusy(false); } };
  const leave = () => Alert.alert("채팅방 나가기", "이 채팅방에서 나갈까요?", [{ text: "취소", style: "cancel" }, { text: "나가기", style: "destructive", onPress: () => { void run(async () => { await api.leaveGroupRoom(room.id); onLeave(); }); } }]);
  const byId = new Map(workspaceMembers.map((member) => [member.id, member]));
  const candidates = workspaceMembers.filter((member) => !room.memberIds.includes(member.id));
  if (inviting) return <View style={styles.content}><View style={styles.inviteHeader}><TouchableOpacity accessibilityRole="button" onPress={() => { setInviting(false); setSelectedIds([]); }}><Text style={styles.link}>‹ 멤버</Text></TouchableOpacity><Text style={styles.inviteTitle}>멤버 초대</Text><TouchableOpacity accessibilityRole="button" disabled={!selectedIds.length || busy} onPress={() => { void run(() => api.addGroupMembers(room.id, selectedIds)).then((success) => { if (success) setInviting(false); }); }}><Text style={selectedIds.length && !busy ? styles.link : styles.muted}>{busy ? "추가 중…" : "완료"}</Text></TouchableOpacity></View><View style={styles.selectedContainer}><Text style={styles.muted}>선택한 멤버 {selectedIds.length}</Text><ScrollView horizontal contentContainerStyle={styles.selectedList}>{selectedIds.map((id) => <TouchableOpacity key={id} style={styles.selectedChip} onPress={() => setSelectedIds((current) => current.filter((selected) => selected !== id))}><Text style={styles.selectedText}>{byId.get(id)?.name ?? "멤버"} ×</Text></TouchableOpacity>)}</ScrollView></View><Text style={styles.muted}>초대할 구성원을 선택해 주세요.</Text><FlatList data={candidates} keyExtractor={(member) => member.id} ListEmptyComponent={<Text style={styles.empty}>초대할 구성원이 없습니다.</Text>} renderItem={({ item }) => <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: selectedIds.includes(item.id) }} style={styles.inviteMember} onPress={() => setSelectedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])}><Text style={selectedIds.includes(item.id) ? styles.activeTab : styles.muted}>{selectedIds.includes(item.id) ? "☑" : "□"}</Text><Text style={styles.rowTitle}>{item.name}</Text></TouchableOpacity>} />{notice ? <Text style={styles.error}>{notice}</Text> : null}</View>;
  return <FlatList style={styles.content} data={room.memberIds} keyExtractor={(id) => id} ListHeaderComponent={<Card title="채팅방 구성원"><Text>{room.memberIds.length}명 · {isAdmin ? "방장" : "구성원"}</Text>{isAdmin ? <Button label="멤버 초대" kind="secondary" onPress={() => { setNotice(""); setInviting(true); }} /> : null}{notice ? <Text style={styles.error}>{notice}</Text> : null}<Button label="채팅방 나가기" kind="secondary" onPress={leave} disabled={busy} /></Card>} renderItem={({ item: id }) => <View style={styles.row}><Text style={styles.rowTitle}>{byId.get(id)?.name ?? "구성원"}{id === room.adminId ? " · 방장" : ""}</Text>{isAdmin && id !== room.adminId ? <View style={styles.memberActions}><TouchableOpacity disabled={busy} onPress={() => run(() => api.transferGroupAdmin(room.id, id))}><Text style={styles.link}>방장 위임</Text></TouchableOpacity><TouchableOpacity disabled={busy} onPress={() => run(() => api.removeGroupMembers(room.id, [id]))}><Text style={styles.error}>내보내기</Text></TouchableOpacity></View> : null}</View>} />;
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 16 },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  activeTab: { color: SeugiColor.Primary500, fontWeight: "700" },
  rowTitle: { fontWeight: "600" },
  row: { backgroundColor: SeugiColor.White, padding: 16, marginBottom: 8, borderRadius: 12, flexDirection: "row", justifyContent: "space-between" },
  memberActions: { flexDirection: "row", gap: 14 },
  link: { color: SeugiColor.Primary500 },
  inviteHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: SeugiColor.White, padding: 14, marginBottom: 12 },
  inviteTitle: { color: SeugiColor.Gray800, fontSize: 17, fontWeight: "700" },
  inviteMember: { minHeight: 58, backgroundColor: SeugiColor.White, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 14, borderBottomWidth: 1, borderBottomColor: SeugiColor.Gray100 },
  empty: { textAlign: "center", color: SeugiColor.Gray500, padding: 24 },
  selectedContainer: { minHeight: 74, backgroundColor: SeugiColor.White, borderWidth: 1, borderColor: SeugiColor.Gray300, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 12, gap: 6 },
  selectedList: { alignItems: "center", gap: 6 },
  selectedChip: { backgroundColor: SeugiColor.Gray100, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 },
  selectedText: { color: SeugiColor.Gray600, fontSize: 13 },
});
