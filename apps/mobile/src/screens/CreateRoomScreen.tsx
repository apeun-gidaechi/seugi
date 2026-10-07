import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Member, Room, Workspace } from "@seugi/contracts";
import { SeugiColor } from "@seugi/design-tokens";
import { Button, Card } from "../components/ui";
import { SeugiTextField } from "../design-system/TextField";
import { api } from "../services/api";

export function CreateRoomScreen({ workspace, onBack, onCreated }: {
  workspace: Workspace;
  onBack: () => void;
  onCreated: (room: Room) => void;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [step, setStep] = useState<"members" | "name">("members");
  const [roomName, setRoomName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectedMembers = useMemo(() => members.filter((member) => selectedIds.includes(member.id)), [members, selectedIds]);

  useEffect(() => {
    let active = true;
    Promise.all([api.workspaceMembers(workspace.id), api.memberInfo()]).then(([result, current]) => active && setMembers((result.data ?? []).filter((member) => member.id !== current.data?.id)))
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : "구성원을 불러오지 못했습니다"));
    return () => { active = false; };
  }, [workspace.id]);

  const create = async (name: string) => {
    if (busy || !selectedIds.length) return;
    setBusy(true);
    setError("");
    try {
      const actualType = selectedIds.length === 1 ? "personal" : "group";
      const result = await api.createRoom(actualType, { workspaceId: workspace.id, name, memberIds: selectedIds });
      const list = await api.rooms(workspace.id, actualType);
      const room = list.data?.find((item) => item.id === result.data);
      if (!room) throw new Error("생성한 채팅방을 불러오지 못했습니다");
      onCreated(room);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "채팅방을 만들지 못했습니다");
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    if (!selectedIds.length || busy) return;
    if (selectedMembers.length === 1) {
      void create(selectedMembers[0]?.name ?? "채팅");
      return;
    }
    setStep("name");
  };

  if (step === "name") return <View style={styles.content}>
    <Card title="채팅방 이름">
      <View style={styles.avatar}><Text style={styles.avatarText}>{selectedMembers[0]?.name.slice(0, 1) ?? "채"}</Text></View>
      <SeugiTextField value={roomName} onChangeText={setRoomName} containerStyle={styles.inputSpacing} placeholder={selectedMembers[0] ? `${selectedMembers[0].name} 외 ${selectedMembers.length - 1}명` : "채팅방 이름"} maxLength={60} autoFocus />
      <Button label={busy ? "만드는 중…" : "완료"} onPress={() => void create(roomName.trim() || `${selectedMembers[0]?.name ?? "멤버"} 외 ${selectedMembers.length - 1}명`)} disabled={busy} />
      <Button label="이전" kind="secondary" onPress={() => setStep("members")} disabled={busy} />
    </Card>
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </View>;

  return <FlatList style={styles.content} data={members} keyExtractor={(member) => member.id}
    ListHeaderComponent={<Card title="멤버 선택"><View style={styles.selected}><Text style={styles.muted}>선택한 멤버</Text><Text>{selectedMembers.length ? selectedMembers.map((member) => member.name).join(" · ") : "멤버를 선택해 주세요"}</Text></View><Button label={busy ? "만드는 중…" : "완료"} onPress={next} disabled={!selectedIds.length || busy} />{error ? <Text style={styles.error}>{error}</Text> : null}</Card>}
    ListEmptyComponent={<Text style={styles.empty}>초대할 구성원이 없습니다.</Text>}
    renderItem={({ item }) => <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: selectedIds.includes(item.id) }} style={styles.member} onPress={() => setSelectedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])}><Text style={styles.check}>{selectedIds.includes(item.id) ? "☑" : "□"}</Text><Text style={styles.memberName}>{item.name}</Text></TouchableOpacity>} />;
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 16 },
  selected: { minHeight: 54, justifyContent: "center", gap: 4 },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
  member: { minHeight: 60, backgroundColor: SeugiColor.White, paddingHorizontal: 16, marginBottom: 1, flexDirection: "row", alignItems: "center", gap: 14 },
  check: { color: SeugiColor.Primary500, fontSize: 22, width: 26 },
  memberName: { color: SeugiColor.Gray800, fontSize: 15 },
  empty: { color: SeugiColor.Gray600, textAlign: "center", padding: 30 },
  inputSpacing: { marginBottom: 10 },
  avatar: { alignSelf: "center", width: 76, height: 76, borderRadius: 38, backgroundColor: SeugiColor.Primary100, alignItems: "center", justifyContent: "center", marginVertical: 16 },
  avatarText: { color: SeugiColor.Primary500, fontSize: 30, fontWeight: "700" },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
});
