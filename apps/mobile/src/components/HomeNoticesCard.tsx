import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { LegacyNotification, Workspace } from "@seugi/contracts";
import { SeugiColor } from "@seugi/design-tokens";
import { api } from "../services/api";

export function HomeNoticesCard({ workspace, canCreate, onOpen, onCreate }: {
  workspace: Workspace;
  canCreate: boolean;
  onOpen: () => void;
  onCreate: () => void;
}) {
  const [items, setItems] = useState<LegacyNotification[]>([]);
  const [memberId, setMemberId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [notices, member] = await Promise.all([api.notifications(workspace.id, 0, 3), api.memberInfo()]);
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

  return <View style={styles.card}>
    <View style={styles.header}>
      <TouchableOpacity accessibilityRole="button" onPress={onOpen} style={styles.titleAction}><Text style={styles.title}>공지</Text><Text style={styles.arrow}>›</Text></TouchableOpacity>
      {canCreate ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="공지 작성" onPress={onCreate} style={styles.create}><Text style={styles.createText}>＋</Text></TouchableOpacity> : null}
    </View>
    {loading ? <ActivityIndicator color={SeugiColor.Primary500} style={styles.loader} /> : null}
    {!loading && error ? <Text style={styles.error}>{error}</Text> : null}
    {!loading && !error && items.length === 0 ? <Text style={styles.empty}>공지가 없어요</Text> : null}
    {items.map((item) => <View key={item.id} style={styles.notice}>
      <Text style={styles.author} numberOfLines={1}>{item.userName ? `${item.userName} · ` : ""}{new Date(item.createdAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}</Text>
      <Text style={styles.noticeTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.content} numberOfLines={3}>{item.content}</Text>
      <View style={styles.reactions}>
        {Object.entries(item.emojis).filter(([, users]) => users.length > 0).map(([emoji, users]) => <TouchableOpacity key={emoji} accessibilityRole="button" accessibilityState={{ selected: users.includes(memberId) }} onPress={() => void toggleReaction(item, emoji)} style={[styles.reaction, users.includes(memberId) && styles.reactionSelected]}><Text>{emoji}</Text><Text style={styles.count}>{users.length}</Text></TouchableOpacity>)}
      </View>
    </View>)}
  </View>;
}

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
  author: { color: SeugiColor.Gray500, fontSize: 12 },
  noticeTitle: { color: SeugiColor.Gray800, fontSize: 15, fontWeight: "600" },
  content: { color: SeugiColor.Gray700, fontSize: 14, lineHeight: 20 },
  reactions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  reaction: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: SeugiColor.Gray200, backgroundColor: SeugiColor.Gray100, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  reactionSelected: { borderColor: SeugiColor.Primary300, backgroundColor: SeugiColor.Primary100 },
  count: { color: SeugiColor.Gray600, fontSize: 12 },
});
