import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { Member, Room } from "@seugi/contracts";
import { Button, Card } from "./ui";
import { api } from "../services/api";

export function ChatRoomManagement({ room, memberId, onRoomChange, onLeave }: { room: Room; memberId: string; onRoomChange: (room: Room) => void; onLeave: () => void }) {
  const [workspaceMembers, setWorkspaceMembers] = useState<Member[]>([]); const [selectedIds, setSelectedIds] = useState<string[]>([]); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false); const isAdmin = room.adminId === memberId;
  const refresh = useCallback(async () => { const [updated, members] = await Promise.all([api.groupRoom(room.id), api.workspaceMembers(room.workspaceId)]); onRoomChange(updated.data ?? room); setWorkspaceMembers(members.data ?? []); }, [room.id, room.workspaceId, onRoomChange]);
  useEffect(() => { refresh().catch((e) => setNotice(e instanceof Error ? e.message : "구성원 정보를 불러오지 못했습니다")); }, [refresh]);
  const run = async (action: () => Promise<unknown>) => { if (busy) return; setBusy(true); setNotice(""); try { await action(); setSelectedIds([]); await refresh(); } catch (e) { setNotice(e instanceof Error ? e.message : "채팅방을 변경하지 못했습니다"); } finally { setBusy(false); } };
  const leave = () => Alert.alert("채팅방 나가기", "이 채팅방에서 나갈까요?", [{ text: "취소", style: "cancel" }, { text: "나가기", style: "destructive", onPress: () => { void run(async () => { await api.leaveGroupRoom(room.id); onLeave(); }); } }]);
  const byId = new Map(workspaceMembers.map((member) => [member.id, member])); const candidates = workspaceMembers.filter((member) => !room.memberIds.includes(member.id));
  return <FlatList style={styles.content} data={room.memberIds} keyExtractor={(id) => id} ListHeaderComponent={<Card title="채팅방 구성원"><Text>{room.memberIds.length}명 · {isAdmin ? "방장" : "구성원"}</Text>{isAdmin && candidates.length ? <><Text style={styles.muted}>추가할 구성원</Text>{candidates.map((member) => <TouchableOpacity key={member.id} onPress={() => setSelectedIds((current) => current.includes(member.id) ? current.filter((id) => id !== member.id) : [...current, member.id])}><Text style={selectedIds.includes(member.id) ? styles.activeTab : styles.rowTitle}>{selectedIds.includes(member.id) ? "☑ " : "☐ "}{member.name}</Text></TouchableOpacity>)}<Button label={busy ? "처리 중…" : `선택한 ${selectedIds.length}명 추가`} onPress={() => run(() => api.addGroupMembers(room.id, selectedIds))} disabled={busy || !selectedIds.length} /></> : null}{notice ? <Text style={styles.error}>{notice}</Text> : null}<Button label="채팅방 나가기" kind="secondary" onPress={leave} disabled={busy} /></Card>} renderItem={({ item: id }) => <View style={styles.row}><Text style={styles.rowTitle}>{byId.get(id)?.name ?? "구성원"}{id === room.adminId ? " · 방장" : ""}</Text>{isAdmin && id !== room.adminId ? <View style={styles.memberActions}><TouchableOpacity disabled={busy} onPress={() => run(() => api.transferGroupAdmin(room.id, id))}><Text style={styles.link}>방장 위임</Text></TouchableOpacity><TouchableOpacity disabled={busy} onPress={() => run(() => api.removeGroupMembers(room.id, [id]))}><Text style={styles.error}>내보내기</Text></TouchableOpacity></View> : null}</View>} />;
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
});
