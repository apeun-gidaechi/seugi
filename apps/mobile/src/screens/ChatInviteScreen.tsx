import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Member } from "@seugi/contracts";
import { SeugiColor } from "@seugi/design-tokens";
import { absoluteApiUrl } from "../utils/url";
import { SeugiAvatar } from "../design-system/Avatar";

type ChatInviteScreenProps = {
  members: Member[];
  selectedIds: string[];
  busy: boolean;
  notice: string;
  onBack: () => void;
  onToggle: (memberId: string) => void;
  onComplete: () => void;
};

/** Standalone member-picker destination matching the native ChatDetail flow. */
export function ChatInviteScreen({ members, selectedIds, busy, notice, onBack, onToggle, onComplete }: ChatInviteScreenProps) {
  const selectedMembers = selectedIds.flatMap((id) => {
    const member = members.find((item) => item.id === id);
    return member ? [member] : [];
  });

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="뒤로" onPress={onBack} disabled={busy}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>멤버 선택</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="선택 완료" onPress={onComplete} disabled={!selectedIds.length || busy}>
          <Text style={[styles.headerAction, (!selectedIds.length || busy) && styles.disabled]}>{busy ? "추가 중…" : "완료"}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.selectedContainer}>
        <Text style={styles.hint}>선택한 멤버 {selectedIds.length}</Text>
        <ScrollView horizontal contentContainerStyle={styles.selectedList} showsHorizontalScrollIndicator={false}>
          {selectedMembers.map((member) => (
            <TouchableOpacity key={member.id} accessibilityRole="button" accessibilityLabel={`${member.name} 선택 해제`} style={styles.selectedChip} onPress={() => onToggle(member.id)} disabled={busy}>
              <Text style={styles.selectedText}>{member.name} ×</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={members}
        keyExtractor={(member) => member.id}
        ListHeaderComponent={<Text style={styles.hint}>초대할 구성원을 선택해 주세요.</Text>}
        ListEmptyComponent={<Text style={styles.empty}>초대할 구성원이 없습니다.</Text>}
        renderItem={({ item }) => {
          const checked = selectedIds.includes(item.id);
          return (
            <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked }} style={styles.memberRow} onPress={() => onToggle(item.id)} disabled={busy}>
              <Text style={checked ? styles.checked : styles.unchecked}>{checked ? "☑" : "□"}</Text>
              <SeugiAvatar uri={item.picture ? absoluteApiUrl(item.picture) : undefined} name={item.name} imageStyle={styles.avatar} fallbackStyle={styles.avatar} labelStyle={styles.avatarText} />
              <Text style={styles.memberName}>{item.name}</Text>
            </TouchableOpacity>
          );
        }}
      />
      {notice ? <Text accessibilityRole="alert" style={styles.error}>{notice}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SeugiColor.White },
  header: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, backgroundColor: SeugiColor.White, borderBottomWidth: 1, borderBottomColor: SeugiColor.Gray100 },
  headerAction: { color: SeugiColor.Gray800, fontSize: 15, minWidth: 48 },
  backIcon: { color: SeugiColor.Gray800, fontSize: 30, lineHeight: 34, minWidth: 48 },
  title: { color: SeugiColor.Gray800, fontSize: 18, fontWeight: "700" },
  disabled: { color: SeugiColor.Gray300 },
  selectedContainer: { minHeight: 64, maxHeight: 136, borderWidth: 1, borderColor: SeugiColor.Gray300, borderRadius: 12, marginHorizontal: 20, marginTop: 16, marginBottom: 12, paddingHorizontal: 8, paddingVertical: 6, gap: 4 },
  selectedList: { alignItems: "center", gap: 6 },
  selectedChip: { backgroundColor: SeugiColor.Gray100, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 7 },
  selectedText: { color: SeugiColor.Gray600, fontSize: 13 },
  hint: { color: SeugiColor.Gray500, fontSize: 12, paddingHorizontal: 20, paddingVertical: 8 },
  memberRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, backgroundColor: SeugiColor.White, borderBottomWidth: 1, borderBottomColor: SeugiColor.Gray100 },
  checked: { color: SeugiColor.Primary500, fontSize: 20 },
  unchecked: { color: SeugiColor.Gray400, fontSize: 20 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: SeugiColor.Primary100 },
  avatarText: { color: SeugiColor.Primary500, fontWeight: "700" },
  memberName: { color: SeugiColor.Gray800, fontSize: 15 },
  empty: { color: SeugiColor.Gray500, textAlign: "center", padding: 24 },
  error: { color: SeugiColor.Red500, margin: 12, textAlign: "center" },
});
