import { useEffect, useRef } from "react";
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { WorkspaceMemberView } from "@seugi/contracts";
import { SeugiColor } from "@seugi/design-tokens";
import { SeugiTopBar } from "../design-system/TopBar";
import { SeugiBackIcon } from "../design-system/BackIcon";
import { SeugiCloseIcon } from "../design-system/NativeIndicators";
import { SeugiAvatar } from "../design-system/Avatar";
import { SeugiCheckbox } from "../design-system/Checkbox";
import { absoluteApiUrl } from "../utils/url";
import { workspaceMemberDisplayName } from "../utils/member";

export function CreateRoomMembersScreen({
  members,
  selectedMembers,
  selectedIds,
  error,
  busy,
  loading,
  onToggleMember,
  onRemoveSelected,
  onBack,
  onComplete,
}: {
  members: WorkspaceMemberView[];
  selectedMembers: WorkspaceMemberView[];
  selectedIds: string[];
  error: string;
  busy: boolean;
  loading: boolean;
  onToggleMember: (id: string) => void;
  onRemoveSelected: (id: string) => void;
  onBack: () => void;
  onComplete: () => void;
}) {
  const selectedScroll = useRef<ScrollView>(null);
  const previousSelectionCount = useRef(0);
  useEffect(() => {
    if (selectedMembers.length > previousSelectionCount.current) {
      const timeout = setTimeout(() => selectedScroll.current?.scrollToEnd({ animated: true }), 50);
      previousSelectionCount.current = selectedMembers.length;
      return () => clearTimeout(timeout);
    }
    previousSelectionCount.current = selectedMembers.length;
  }, [selectedMembers.length]);

  return (
    <>
      <SeugiTopBar
        backgroundColor={SeugiColor.White}
        leading={
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="뒤로" onPress={onBack}>
            <SeugiBackIcon />
          </TouchableOpacity>
        }
        title={<Text style={styles.title}>멤버 선택</Text>}
        trailing={
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="완료"
            onPress={onComplete}
            disabled={busy || !selectedIds.length}
          >
            <Text style={[styles.complete, (busy || !selectedIds.length) && styles.disabled]}>
              {busy ? "생성 중…" : "완료"}
            </Text>
          </TouchableOpacity>
        }
      />
      <FlatList
        style={styles.content}
        data={members}
        keyExtractor={(member) => member.id}
        ListHeaderComponent={
          <View style={styles.memberSelection}>
            <ScrollView
              ref={selectedScroll}
              style={styles.selected}
              contentContainerStyle={styles.selectedContent}
              nestedScrollEnabled
            >
              <View style={styles.selectedMembers}>
                {selectedMembers.length ? (
                  selectedMembers.map((member) => (
                    <TouchableOpacity
                      key={member.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${workspaceMemberDisplayName(member)} 선택 해제`}
                      onPress={() => onRemoveSelected(member.id)}
                      style={styles.selectedMember}
                    >
                      <Text style={styles.selectedName}>{workspaceMemberDisplayName(member)}</Text>
                      <SeugiCloseIcon size={14} />
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.muted}>멤버를 선택해 주세요</Text>
                )}
              </View>
            </ScrollView>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View accessibilityLabel="구성원 불러오는 중">
              {Array.from({ length: 3 }, (_, index) => (
                <View key={index} style={styles.memberLoadingRow}>
                  <View style={styles.memberLoadingAvatar} />
                  <View style={styles.memberLoadingName} />
                </View>
              ))}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selectedIds.includes(item.id) }}
            style={styles.member}
            onPress={() => onToggleMember(item.id)}
          >
            <View style={styles.memberAvatar}>
              <SeugiAvatar
                uri={item.picture ? absoluteApiUrl(item.picture) : undefined}
                name={item.name}
                imageStyle={styles.memberAvatarImage}
                fallbackStyle={styles.memberAvatar}
                labelStyle={styles.memberInitial}
              />
            </View>
            <Text style={styles.memberName}>{workspaceMemberDisplayName(item)}</Text>
            <SeugiCheckbox checked={selectedIds.includes(item.id)} />
          </TouchableOpacity>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  memberSelection: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: SeugiColor.White,
  },
  back: { color: SeugiColor.Gray700, fontSize: 30, lineHeight: 34 },
  title: {
    flex: 1,
    textAlign: "center",
    color: SeugiColor.Gray800,
    fontSize: 18,
    fontWeight: "700",
  },
  complete: { color: SeugiColor.Gray800, fontSize: 15 },
  disabled: { color: SeugiColor.Gray400 },
  selected: {
    minHeight: 52,
    maxHeight: 118,
    borderWidth: 1,
    borderColor: SeugiColor.Gray300,
    borderRadius: 12,
    padding: 4,
  },
  selectedContent: { flexGrow: 1, justifyContent: "center" },
  selectedMembers: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4 },
  selectedMember: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: SeugiColor.Gray100,
  },
  selectedName: { color: SeugiColor.Gray600, fontSize: 14 },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
  member: {
    minHeight: 72,
    backgroundColor: SeugiColor.White,
    paddingHorizontal: 20,
    marginBottom: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: SeugiColor.Gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarImage: { width: 36, height: 36 },
  memberInitial: { color: SeugiColor.Gray600, fontSize: 18, fontWeight: "600" },
  memberName: { color: SeugiColor.Gray800, fontSize: 15 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  memberLoadingRow: {
    height: 72,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: SeugiColor.White,
  },
  memberLoadingAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SeugiColor.Gray200,
  },
  memberLoadingName: {
    width: 52,
    height: 21,
    borderRadius: 12,
    backgroundColor: SeugiColor.Gray200,
  },
});
