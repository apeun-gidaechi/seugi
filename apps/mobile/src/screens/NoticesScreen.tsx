import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { SeugiColor } from "@seugi/design-tokens";
import type { Notification, Workspace } from "@seugi/contracts";
import { api } from "../services/api";
import { SeugiEmptyState } from "../design-system/EmptyState";
import { SeugiTextField } from "../design-system/TextField";
import { loadAllPages } from "../utils/pagination";
import { EMOJI_CATEGORIES, filterEmojiCatalog, type EmojiCategoryId } from "../utils/emojiCatalog";

export function NoticesScreen({ workspace, onCreate, onEdit, refreshToken = 0 }: { workspace: Workspace; onCreate: () => void; onEdit: (notice: Notification) => void; refreshToken?: number }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState("");
  const [memberId, setMemberId] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [emojiTarget, setEmojiTarget] = useState<Notification>();
  const [emojiSearch, setEmojiSearch] = useState("");
  const [emojiCategory, setEmojiCategory] = useState<EmojiCategoryId>(EMOJI_CATEGORIES[0].id);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const currentPage = useRef(-1);
  const loadingMoreRef = useRef(false);
  const requestGeneration = useRef(0);
  const pageSize = Platform.OS === "ios" ? 100 : 20;
  const refresh = useCallback(async () => {
    const generation = ++requestGeneration.current;
    loadingMoreRef.current = false;
    setLoadingMore(false);
    setRefreshing(true);
    setLoading(true);
    setLoadFailed(false);
    setError("");
    currentPage.current = -1;
    setHasNextPage(false);
    try {
      const nextItems = Platform.OS === "ios"
        ? await loadAllPages(
          async (page) => (await api.notifications(workspace.id, page, pageSize)).data ?? [],
          pageSize,
          () => generation === requestGeneration.current,
        )
        : (await api.notifications(workspace.id, 0, pageSize)).data ?? [];
      if (generation !== requestGeneration.current) return;
      setItems(nextItems);
      currentPage.current = 0;
      setHasNextPage(Platform.OS === "android" && nextItems.length === pageSize);
      setRefreshing(false);
      setLoading(false);
      setLoadFailed(false);
    } catch (e) {
      if (generation === requestGeneration.current) {
        setError(e instanceof Error ? e.message : "공지를 불러오지 못했습니다");
        if (Platform.OS === "ios") setItems([]);
        setRefreshing(false);
        setLoading(false);
        setLoadFailed(true);
      }
    }
  }, [pageSize, workspace.id]);
  useEffect(() => {
    refresh();
  }, [refresh, refreshToken]);
  useEffect(() => {
    let active = true;
    Promise.all([api.memberInfo(), api.myProfile(workspace.id)]).then(([member, profile]) => {
      if (!active) return;
      setMemberId(member.data?.id ?? "");
      setCanManage(workspace.ownerId === member.data?.id || ["ADMIN", "MIDDLE_ADMIN"].includes(profile.data?.role ?? ""));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [workspace.id, workspace.ownerId]);
  const react = async (item: Notification, emoji: string) => {
    if (!memberId) { setError("사용자 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요."); return; }
    const users = item.emojis[emoji] ?? [];
    const selected = users.includes(memberId);
    const nextUsers = selected ? users.filter((id) => id !== memberId) : [...users, memberId];
    const nextEmojis = { ...item.emojis };
    if (nextUsers.length) nextEmojis[emoji] = nextUsers;
    else delete nextEmojis[emoji];
    setItems((current) => current.map((notice) => notice.id === item.id ? { ...notice, emojis: nextEmojis } : notice));
    // Both native clients keep the optimistic reaction if the request fails and do not surface an error.
    try { await api.toggleNotificationEmoji(item.id, emoji); }
    catch { /* Keep the locally toggled reaction, matching Android and iOS. */ }
    finally { setEmojiTarget(undefined); }
  };
  const loadNextPage = async () => {
    if (Platform.OS !== "android" || !hasNextPage || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError("");
    const page = currentPage.current + 1;
    const generation = requestGeneration.current;
    try {
      const result = await api.notifications(workspace.id, page, pageSize);
      if (generation !== requestGeneration.current) return;
      const nextItems = result.data ?? [];
      setItems((current) => {
        const ids = new Set(current.map((item) => item.id));
        return [...current, ...nextItems.filter((item) => !ids.has(item.id))];
      });
      currentPage.current = page;
      setHasNextPage(nextItems.length === pageSize);
    } catch (e) { if (generation === requestGeneration.current) setError(e instanceof Error ? e.message : "다음 공지를 불러오지 못했습니다"); }
    finally { if (generation === requestGeneration.current) { loadingMoreRef.current = false; setLoadingMore(false); } }
  };
  const executeRemove = (item: Notification) => {
    void api.deleteNotification(workspace.id, item.id)
      .then(() => {
        setItems((current) => current.filter((notice) => notice.id !== item.id));
        if (Platform.OS === "ios") Alert.alert("삭제 성공", undefined, [{ text: "닫기" }]);
      })
      .catch((e) => {
        if (Platform.OS === "ios") Alert.alert("삭제 실패", undefined, [{ text: "확인" }]);
        else setError(e instanceof Error ? e.message : "공지를 삭제하지 못했습니다");
      });
  };
  const remove = (item: Notification) => {
    if (Platform.OS === "android") {
      executeRemove(item);
      return;
    }
    Alert.alert("공지를 정말 삭제하시겠습니까?", undefined, [
      { text: "삭제", style: "destructive", onPress: () => executeRemove(item) },
      { text: "닫기", style: "cancel" },
    ]);
  };
  const showActions = (item: Notification) => {
    const isAuthor = item.authorId === memberId;
    const canDelete = isAuthor || (Platform.OS === "android" && canManage);
    const actions: Array<{ text: string; style?: "cancel" | "destructive"; onPress?: () => void }> = [
      ...(isAuthor ? [{ text: "공지 수정", onPress: () => onEdit(item) }] : []),
      { text: "공지 신고" },
      ...(canDelete ? [{ text: "공지 삭제", style: "destructive" as const, onPress: () => remove(item) }] : []),
      { text: "닫기", style: "cancel" },
    ];
    Alert.alert("공지", "", actions);
  };
  return <><FlatList style={styles.content} data={items} keyExtractor={(item) => item.id}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={SeugiColor.Primary500} />}
    onEndReached={() => void loadNextPage()}
    onEndReachedThreshold={0.5}
    ListHeaderComponent={error && !(Platform.OS === "ios" && loadFailed) ? <Text style={styles.error}>{error}</Text> : null}
    ListFooterComponent={loadingMore ? <ActivityIndicator color={SeugiColor.Primary500} style={styles.loader} /> : hasNextPage ? <TouchableOpacity style={styles.loadMore} onPress={() => void loadNextPage()}><Text style={styles.link}>이전 공지 더 보기</Text></TouchableOpacity> : null}
    contentContainerStyle={styles.noticeListContent}
    ListEmptyComponent={Platform.OS === "ios" && loading
      ? <ActivityIndicator color={SeugiColor.Primary500} style={styles.loader} />
      : <SeugiEmptyState title={Platform.OS === "ios" && error ? "불러오기 실패" : "공지가 없어요"} style={styles.empty} />}
    renderItem={({ item }) => <Pressable onLongPress={Platform.OS === "android" ? () => showActions(item) : undefined} style={styles.noticeCard}>
      <View style={styles.noticeHeader}><Text numberOfLines={1} style={styles.noticeAuthorDate}>{item.userName ? `${item.userName} · ` : ""}{new Date(item.createdAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })}</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="공지 메뉴" onPress={() => showActions(item)} hitSlop={8}><Svg width={24} height={25} viewBox="0 0 24 25"><Path fill={SeugiColor.Gray500} d="M13.5 6.814a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0 6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m0 6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0" /></Svg></TouchableOpacity></View>
      <Text style={styles.noticeTitle}>{item.title}</Text>
      <Text style={styles.noticeContent}>{item.content}</Text>
      <View style={styles.reactions}><TouchableOpacity accessibilityRole="button" accessibilityLabel="반응 추가" style={styles.addReaction} onPress={() => { setEmojiSearch(""); setEmojiCategory(EMOJI_CATEGORIES[0].id); setEmojiTarget(item); }}><Svg width={28} height={28} viewBox="0 0 24 24"><Path fill={SeugiColor.Gray600} d="M9.5 10C9.5 10.552 9.052 11 8.5 11S7.5 10.552 7.5 10 7.948 9 8.5 9s1 .448 1 1Zm4 0c0 .552-.448 1-1 1s-1-.448-1-1 .448-1 1-1 1 .448 1 1ZM7.006 12.436c.312-.273.786-.242 1.058.07 1.555 1.776 4.318 1.776 5.872 0a.75.75 0 1 1 1.128.988c-2.151 2.459-5.977 2.459-8.128 0a.75.75 0 0 1 .07-1.058Z" /><Path fill={SeugiColor.Gray600} fillRule="evenodd" d="M10.5 4.75A6.25 6.25 0 1 0 11.548 17.162 4.5 4.5 0 0 1 16 12c.225 0 .446.017.662.048A6.25 6.25 0 0 0 10.5 4.75Zm7.601 7.77A7.75 7.75 0 1 0 12.02 18.6 4.5 4.5 0 1 0 18.101 12.52ZM16 14a.5.5 0 0 1 .5.5V16H18a.5.5 0 0 1 0 1h-1.5v1.5a.5.5 0 0 1-1 0V17H14a.5.5 0 0 1 0-1h1.5v-1.5a.5.5 0 0 1 .5-.5Z" /></Svg></TouchableOpacity>{Object.entries(item.emojis).filter(([, users]) => users.length > 0).map(([emoji, users]) => <TouchableOpacity key={emoji} accessibilityRole="button" accessibilityState={{ selected: users.includes(memberId) }} style={[styles.reaction, users.includes(memberId) && styles.reactionSelected]} onPress={() => void react(item, emoji)}><Text>{emoji}</Text><Text style={styles.reactionCount}>{users.length}</Text></TouchableOpacity>)}</View>
    </Pressable>}
    />
    <Modal visible={!!emojiTarget} transparent animationType="slide" onRequestClose={() => setEmojiTarget(undefined)}>
      <View style={[styles.modalBackdrop, Platform.OS === "android" ? styles.androidEmojiBackdrop : null]}>
        <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setEmojiTarget(undefined)} />
        <View style={[styles.emojiSheet, Platform.OS === "android" ? styles.androidEmojiSheet : styles.iosEmojiSheet]}>
          {Platform.OS === "ios" ? <View style={styles.sheetHandle} /> : null}
          <SeugiTextField value={emojiSearch} onChangeText={setEmojiSearch} fieldStyle={styles.emojiSearchField} style={styles.emojiSearchInput} placeholder="이모지 검색" />
          {!emojiSearch ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiCategories}>{EMOJI_CATEGORIES.map((category) => <TouchableOpacity key={category.id} accessibilityRole="button" accessibilityState={{ selected: emojiCategory === category.id }} style={[styles.emojiCategory, emojiCategory === category.id && styles.emojiCategorySelected]} onPress={() => setEmojiCategory(category.id)}><Text style={styles.emojiCategorySymbol}>{category.symbol}</Text></TouchableOpacity>)}</ScrollView> : null}
          <ScrollView style={styles.emojiPickerList} contentContainerStyle={styles.emojiGrid}>{filterEmojiCatalog(emojiCategory, emojiSearch).map(({ emoji, names }) => <TouchableOpacity key={emoji} accessibilityRole="button" accessibilityLabel={names.at(-1)} style={styles.emojiOption} onPress={() => emojiTarget && void react(emojiTarget, emoji)}><Text style={styles.emojiText}>{emoji}</Text></TouchableOpacity>)}</ScrollView>
        </View>
      </View>
    </Modal></>;
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 20 },
  noticeListContent: { paddingTop: 12, paddingBottom: 80 },
  noticeCard: { backgroundColor: SeugiColor.White, borderRadius: 8, padding: 12, marginBottom: 8, gap: 8, shadowColor: SeugiColor.Black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 1 },
  noticeHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  noticeAuthorDate: { flex: 1, minWidth: 0, color: SeugiColor.Gray600, fontSize: 12 },
  noticeTitle: { color: SeugiColor.Gray800, fontSize: 17, fontWeight: "600" },
  noticeContent: { color: SeugiColor.Gray800, fontSize: 14 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  empty: { paddingVertical: 30 },
  link: { color: SeugiColor.Primary500 },
  reactions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, paddingTop: 2 },
  loader: { padding: 16 },
  loadMore: { alignItems: "center", paddingVertical: 18 },
  reaction: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: SeugiColor.Gray200, backgroundColor: SeugiColor.Gray100, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  reactionSelected: { borderColor: SeugiColor.Primary300, backgroundColor: SeugiColor.Primary100 },
  reactionCount: { color: SeugiColor.Gray600, fontSize: 14 },
  addReaction: { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginRight: 4 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.32)" },
  androidEmojiBackdrop: { backgroundColor: "rgba(0,0,0,0.32)" },
  modalDismiss: { flex: 1 },
  emojiSheet: { backgroundColor: SeugiColor.White },
  iosEmojiSheet: { height: 400, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20 },
  androidEmojiSheet: { height: "50%", paddingHorizontal: 8, paddingTop: 8, paddingBottom: 8 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: SeugiColor.Gray300, alignSelf: "center", marginBottom: 16 },
  emojiSearchField: { height: 40, minHeight: 40, borderRadius: 8 },
  emojiSearchInput: { paddingHorizontal: 12 },
  emojiCategories: { flexDirection: "row", gap: 4, paddingVertical: 8 },
  emojiCategory: { width: 38, height: 38, alignItems: "center", justifyContent: "center", borderRadius: 8 },
  emojiCategorySelected: { backgroundColor: SeugiColor.Gray100 },
  emojiCategorySymbol: { fontSize: 20 },
  emojiPickerList: { flex: 1 },
  emojiGrid: { flexDirection: "row", flexWrap: "wrap", paddingVertical: 8 },
  emojiOption: { width: "12.5%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  emojiText: { fontSize: 26 },
});
