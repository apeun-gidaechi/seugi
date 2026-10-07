import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { LegacyNotification, Workspace } from "@seugi/contracts";
import { SeugiColor } from "@seugi/design-tokens";
import { api } from "../services/api";

export function HomeNoticesCard({ workspace, canCreate, canManage, onOpen, onCreate, onEdit }: {
  workspace: Workspace;
  canCreate: boolean;
  canManage: boolean;
  onOpen: () => void;
  onCreate: () => void;
  onEdit: (notice: LegacyNotification) => void;
}) {
  const [items, setItems] = useState<LegacyNotification[]>([]);
  const [memberId, setMemberId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [emojiTarget, setEmojiTarget] = useState<LegacyNotification>();
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [notices, member] = await Promise.all([api.notifications(workspace.id, 0, 20), api.memberInfo()]);
      setItems(notices.data ?? []);
      setMemberId(member.data?.id ?? "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "공지를 불러오지 못했습니다");
    } finally {
      setLoading(false);
    }
  }, [workspace.id]);
  useEffect(() => { void load(); }, [load]);

  const toggleReaction = async (notice: LegacyNotification, emoji: string) => {
    if (!memberId) return;
    const wasSelected = (notice.emojis[emoji] ?? []).includes(memberId);
    setItems((current) => current.map((item) => item.id !== notice.id ? item : {
      ...item,
      emojis: {
        ...item.emojis,
        [emoji]: wasSelected
          ? (item.emojis[emoji] ?? []).filter((id) => id !== memberId)
          : [...(item.emojis[emoji] ?? []), memberId],
      },
    }));
    try {
      await api.toggleNotificationEmoji(notice.id, emoji);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "반응을 저장하지 못했습니다");
      await load();
    }
  };

  const removeNotice = (notice: LegacyNotification) => Alert.alert("공지 삭제", `‘${notice.title}’ 공지를 삭제할까요?`, [
    { text: "취소", style: "cancel" },
    { text: "삭제", style: "destructive", onPress: () => { void api.deleteNotification(workspace.id, notice.id).then(() => setItems((current) => current.filter((item) => item.id !== notice.id))).catch((reason) => setError(reason instanceof Error ? reason.message : "공지를 삭제하지 못했습니다")); } },
  ]);
  const showActions = (notice: LegacyNotification) => Alert.alert("공지", "", [
    ...(notice.authorId === memberId ? [{ text: "공지 수정", onPress: () => onEdit(notice) }] : []),
    ...(!canManage && notice.authorId !== memberId ? [{ text: "공지 신고" }] : []),
    ...(canManage || notice.authorId === memberId ? [{ text: "공지 삭제", style: "destructive" as const, onPress: () => removeNotice(notice) }] : []),
    { text: "닫기", style: "cancel" },
  ]);

  return <View style={styles.card}>
    <View style={styles.header}>
      <TouchableOpacity accessibilityRole="button" onPress={onOpen} style={styles.titleAction}><Text style={styles.title}>공지</Text><Text style={styles.arrow}>›</Text></TouchableOpacity>
      {canCreate ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="공지 작성" onPress={onCreate} style={styles.create}><Text style={styles.createText}>＋</Text></TouchableOpacity> : null}
    </View>
    {loading ? <ActivityIndicator color={SeugiColor.Primary500} style={styles.loader} /> : null}
    {!loading && error ? <Text style={styles.error}>{error}</Text> : null}
    {!loading && !error && items.length === 0 ? <Text style={styles.empty}>공지가 없어요</Text> : null}
    {items.map((item) => <View key={item.id} style={styles.notice}>
      <View style={styles.noticeHeader}><Text style={styles.author} numberOfLines={1}>{item.userName ? `${item.userName} · ` : ""}{new Date(item.lastModifiedDate ?? item.createdAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })}</Text>{canCreate ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="공지 메뉴" onPress={() => showActions(item)} hitSlop={8}><Text style={styles.menu}>⋮</Text></TouchableOpacity> : null}</View>
      <Text style={styles.noticeTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.content}>{item.content}</Text>
      <View style={styles.reactions}>
        {Object.entries(item.emojis).filter(([, users]) => users.length > 0).map(([emoji, users]) => <TouchableOpacity key={emoji} accessibilityRole="button" accessibilityState={{ selected: users.includes(memberId) }} onPress={() => void toggleReaction(item, emoji)} style={[styles.reaction, users.includes(memberId) && styles.reactionSelected]}><Text>{emoji}</Text><Text style={styles.count}>{users.length}</Text></TouchableOpacity>)}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="반응 추가" onPress={() => setEmojiTarget(item)} style={styles.addReaction}><Text style={styles.addReactionText}>＋</Text></TouchableOpacity>
      </View>
    </View>)}
    <Modal visible={!!emojiTarget} transparent animationType="slide" onRequestClose={() => setEmojiTarget(undefined)}>
      <View style={styles.modalBackdrop}><TouchableOpacity accessibilityRole="button" accessibilityLabel="이모지 선택 닫기" style={styles.modalDismiss} activeOpacity={1} onPress={() => setEmojiTarget(undefined)} /><View style={styles.emojiSheet}><View style={styles.handle} /><Text style={styles.sheetTitle}>반응 추가</Text><Text style={styles.sheetHint}>이모지를 선택하세요.</Text><ScrollView contentContainerStyle={styles.emojiGrid}>{NOTICE_EMOJIS.map((emoji) => <TouchableOpacity key={emoji} accessibilityRole="button" accessibilityLabel={`${emoji} 반응`} style={styles.emojiOption} onPress={() => { if (emojiTarget) void toggleReaction(emojiTarget, emoji); setEmojiTarget(undefined); }}><Text style={styles.emojiText}>{emoji}</Text></TouchableOpacity>)}</ScrollView></View></View>
    </Modal>
  </View>;
}

const NOTICE_EMOJIS = ["👍", "👎", "❤️", "😍", "😂", "😮", "😢", "😡", "🙏", "👏", "🎉", "🔥", "💯", "✅", "⭐", "😊", "🤣", "🥰", "🤔", "💪", "🙌", "👀", "✨", "☕", "🌱", "📚", "💡", "🎂", "🎁", "🏆", "😆", "😳", "😤", "👌"];

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 12, marginBottom: 4, padding: 16, gap: 10, borderRadius: 14, backgroundColor: SeugiColor.White },
  header: { minHeight: 28, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  titleAction: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  title: { color: SeugiColor.Gray800, fontSize: 17, fontWeight: "700" },
  arrow: { color: SeugiColor.Gray500, fontSize: 22, lineHeight: 24 },
  create: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  createText: { color: SeugiColor.Primary500, fontSize: 24, lineHeight: 28 },
  loader: { padding: 12 },
  empty: { color: SeugiColor.Gray500, paddingVertical: 10 },
  error: { color: SeugiColor.Red500, paddingVertical: 8 },
  notice: { paddingTop: 10, borderTopWidth: 1, borderTopColor: SeugiColor.Gray100, gap: 6 },
  noticeHeader: { minHeight: 26, flexDirection: "row", alignItems: "center", gap: 8 },
  author: { flex: 1, minWidth: 0, color: SeugiColor.Gray500, fontSize: 12 },
  menu: { color: SeugiColor.Gray500, fontSize: 20, lineHeight: 24, paddingHorizontal: 4 },
  noticeTitle: { color: SeugiColor.Gray800, fontSize: 15, fontWeight: "600" },
  content: { color: SeugiColor.Gray700, fontSize: 14, lineHeight: 20 },
  reactions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  reaction: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: SeugiColor.Gray200, backgroundColor: SeugiColor.Gray100, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  reactionSelected: { borderColor: SeugiColor.Primary300, backgroundColor: SeugiColor.Primary100 },
  count: { color: SeugiColor.Gray600, fontSize: 12 },
  addReaction: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  addReactionText: { color: SeugiColor.Gray600, fontSize: 18 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.32)" },
  modalDismiss: { flex: 1 },
  emojiSheet: { maxHeight: "58%", backgroundColor: SeugiColor.White, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: SeugiColor.Gray300, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { color: SeugiColor.Gray800, fontSize: 17, fontWeight: "700", marginBottom: 4 },
  sheetHint: { color: SeugiColor.Gray500, fontSize: 12 },
  emojiGrid: { flexDirection: "row", flexWrap: "wrap", paddingVertical: 14 },
  emojiOption: { width: "12.5%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  emojiText: { fontSize: 26 },
});
