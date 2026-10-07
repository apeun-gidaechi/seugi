import { useEffect, useMemo, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Member, Room, Workspace } from "@seugi/contracts";
import { SeugiColor } from "@seugi/design-tokens";
import { SeugiTextField } from "../design-system/TextField";
import { SeugiTopBar } from "../design-system/TopBar";
import { SeugiAvatar } from "../design-system/Avatar";
import { api } from "../services/api";
import { absoluteApiUrl } from "../utils/url";

export function CreateRoomScreen({ workspace, step, onNavigate, onBack, onCreated }: {
  workspace: Workspace;
  step: "members" | "name";
  onNavigate: (route: "createGroupRoomName") => void;
  onBack: () => void;
  onCreated: (room: Room) => void;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
    onNavigate("createGroupRoomName");
  };
  const complete = () => {
    if (step === "members") next();
    else void create(roomName.trim() || `${selectedMembers[0]?.name ?? "멤버"} 외 ${selectedMembers.length - 1}명`);
  };

  const topBar = <SeugiTopBar
    backgroundColor={SeugiColor.White}
    leading={<TouchableOpacity accessibilityRole="button" accessibilityLabel="뒤로" onPress={onBack}><Text style={styles.back}>‹</Text></TouchableOpacity>}
    title={step === "members" ? <Text style={styles.title}>멤버 선택</Text> : null}
    trailing={<TouchableOpacity accessibilityRole="button" accessibilityLabel="완료" onPress={complete} disabled={busy || (step === "members" && !selectedIds.length)}><Text style={[styles.complete, (busy || (step === "members" && !selectedIds.length)) && styles.disabled]}>{busy ? "생성 중…" : "완료"}</Text></TouchableOpacity>}
  />;

  if (step === "name") return <>
    {topBar}
    <View style={styles.nameContent}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{selectedMembers[0]?.name.slice(0, 1) ?? "채"}</Text><Text style={styles.avatarAdd}>＋</Text></View>
      <Text style={styles.nameLabel}>채팅방 이름</Text>
      <SeugiTextField value={roomName} onChangeText={setRoomName} containerStyle={styles.inputSpacing} placeholder={selectedMembers[0] ? `${selectedMembers[0].name}${selectedMembers.length > 1 ? ` 외 ${selectedMembers.length - 1}명` : ""}` : "채팅방 이름"} maxLength={60} autoFocus />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  </>;

  return <>
    {topBar}
    <FlatList style={styles.content} data={members} keyExtractor={(member) => member.id}
    ListHeaderComponent={<View style={styles.memberSelection}><ScrollView style={styles.selected} contentContainerStyle={styles.selectedContent} nestedScrollEnabled><View style={styles.selectedMembers}>{selectedMembers.length ? selectedMembers.map((member) => <TouchableOpacity key={member.id} accessibilityRole="button" accessibilityLabel={`${member.name} 선택 해제`} onPress={() => setSelectedIds((current) => current.filter((id) => id !== member.id))} style={styles.selectedMember}><Text style={styles.selectedName}>{member.name}</Text><Text style={styles.removeSelected}>×</Text></TouchableOpacity>) : <Text style={styles.muted}>멤버를 선택해 주세요</Text>}</View></ScrollView>{error ? <Text style={styles.error}>{error}</Text> : null}</View>}
    ListEmptyComponent={<Text style={styles.empty}>초대할 구성원이 없습니다.</Text>}
    renderItem={({ item }) => <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: selectedIds.includes(item.id) }} style={styles.member} onPress={() => setSelectedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])}><View style={styles.memberAvatar}><SeugiAvatar uri={item.picture ? absoluteApiUrl(item.picture) : undefined} name={item.name} imageStyle={styles.memberAvatarImage} fallbackStyle={styles.memberAvatar} labelStyle={styles.memberInitial} /></View><Text style={styles.memberName}>{item.name}</Text><Text style={styles.check}>{selectedIds.includes(item.id) ? "☑" : "□"}</Text></TouchableOpacity>} />
  </>;
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  nameContent: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  memberSelection: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10, backgroundColor: SeugiColor.White },
  back: { color: SeugiColor.Gray700, fontSize: 30, lineHeight: 34 },
  title: { flex: 1, textAlign: "center", color: SeugiColor.Gray800, fontSize: 18, fontWeight: "700" },
  complete: { color: SeugiColor.Gray800, fontSize: 15 },
  disabled: { color: SeugiColor.Gray400 },
  nameLabel: { color: SeugiColor.Gray800, fontSize: 16, fontWeight: "600", marginBottom: 4 },
  selected: { minHeight: 52, maxHeight: 118, borderWidth: 1, borderColor: SeugiColor.Gray300, borderRadius: 12, padding: 4 },
  selectedContent: { flexGrow: 1, justifyContent: "center" },
  selectedMembers: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4 },
  selectedMember: { minHeight: 34, flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: SeugiColor.Gray100 },
  selectedName: { color: SeugiColor.Gray600, fontSize: 14 },
  removeSelected: { color: SeugiColor.Gray500, fontSize: 16, lineHeight: 18 },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
  member: { minHeight: 72, backgroundColor: SeugiColor.White, paddingHorizontal: 20, marginBottom: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, overflow: "hidden", backgroundColor: SeugiColor.Gray100, alignItems: "center", justifyContent: "center" },
  memberAvatarImage: { width: 36, height: 36 },
  memberInitial: { color: SeugiColor.Gray600, fontSize: 18, fontWeight: "600" },
  check: { color: SeugiColor.Primary500, fontSize: 22, width: 26 },
  memberName: { color: SeugiColor.Gray800, fontSize: 15 },
  empty: { color: SeugiColor.Gray600, textAlign: "center", padding: 30 },
  inputSpacing: { marginBottom: 10 },
  avatar: { alignSelf: "center", width: 80, height: 80, borderRadius: 40, backgroundColor: SeugiColor.Primary100, alignItems: "center", justifyContent: "center", marginBottom: 16, position: "relative" },
  avatarText: { color: SeugiColor.Primary500, fontSize: 30, fontWeight: "700" },
  avatarAdd: { position: "absolute", right: 0, bottom: 0, color: SeugiColor.Gray600, fontSize: 22 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
});
