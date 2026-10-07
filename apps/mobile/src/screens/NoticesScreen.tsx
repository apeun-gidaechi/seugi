import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { Notification, Workspace } from "@seugi/contracts";
import { Button, Card } from "../components/ui";
import { api } from "../services/api";
import { SeugiTextField } from "../design-system/TextField";
import { SeugiTopBar } from "../design-system/TopBar";

export function NoticesScreen({ workspace, onCreate, onEdit }: { workspace: Workspace; onCreate: () => void; onEdit: (notice: Notification) => void }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState("");
  const [memberId, setMemberId] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [emojiTarget, setEmojiTarget] = useState<Notification>();
  const [customEmoji, setCustomEmoji] = useState("");
  const [hasNextPage, setHasNextPage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const currentPage = useRef(-1);
  const loadingMoreRef = useRef(false);
  const requestGeneration = useRef(0);
  const pageSize = 20;
  const refresh = useCallback(async () => {
    const generation = ++requestGeneration.current;
    loadingMoreRef.current = false;
    setLoadingMore(false);
    setRefreshing(true);
    setError("");
    currentPage.current = -1;
    setHasNextPage(false);
    try {
      const result = await api.notifications(workspace.id, 0, pageSize);
      if (generation !== requestGeneration.current) return;
      setItems(result.data ?? []);
      currentPage.current = 0;
      setHasNextPage((result.data?.length ?? 0) === pageSize);
      setRefreshing(false);
    } catch (e) { if (generation === requestGeneration.current) { setError(e instanceof Error ? e.message : "공지를 불러오지 못했습니다"); setRefreshing(false); } }
  }, [workspace.id]);
  useEffect(() => {
    refresh();
    let active = true;
    Promise.all([api.memberInfo(), api.myProfile(workspace.id)]).then(([member, profile]) => {
      if (!active) return;
      setMemberId(member.data?.id ?? "");
      setCanManage(workspace.ownerId === member.data?.id || ["ADMIN", "MIDDLE_ADMIN"].includes(profile.data?.role ?? ""));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [refresh, workspace.id, workspace.ownerId]);
  const react = async (item: Notification, emoji: string) => {
    if (!memberId) { setError("사용자 정보를 불러오는 중입니다. 잠시 후 다시 시도해 주세요."); return; }
    const users = item.emojis[emoji] ?? [];
    const selected = users.includes(memberId);
    const nextUsers = selected ? users.filter((id) => id !== memberId) : [...users, memberId];
    const nextEmojis = { ...item.emojis };
    if (nextUsers.length) nextEmojis[emoji] = nextUsers;
    else delete nextEmojis[emoji];
    setItems((current) => current.map((notice) => notice.id === item.id ? { ...notice, emojis: nextEmojis } : notice));
    try { await api.toggleNotificationEmoji(item.id, emoji); }
    catch (e) { setItems((current) => current.map((notice) => notice.id === item.id ? item : notice)); setError(e instanceof Error ? e.message : "반응을 저장하지 못했습니다"); }
    finally { setEmojiTarget(undefined); }
  };
  const loadNextPage = async () => {
    if (!hasNextPage || loadingMoreRef.current) return;
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
  const remove = (item: Notification) => Alert.alert("공지 삭제", `‘${item.title}’ 공지를 삭제할까요?`, [
    { text: "취소", style: "cancel" },
    { text: "삭제", style: "destructive", onPress: () => { void api.deleteNotification(workspace.id, item.id).then(() => setItems((current) => current.filter((notice) => notice.id !== item.id))).catch((e) => setError(e instanceof Error ? e.message : "공지를 삭제하지 못했습니다")); } },
  ]);
  return <><FlatList style={styles.content} data={items} keyExtractor={(item) => item.id}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={SeugiColor.Primary500} />}
    onEndReached={() => void loadNextPage()}
    onEndReachedThreshold={0.5}
    ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
    ListFooterComponent={loadingMore ? <ActivityIndicator color={SeugiColor.Primary500} style={styles.loader} /> : hasNextPage ? <TouchableOpacity style={styles.loadMore} onPress={() => void loadNextPage()}><Text style={styles.link}>이전 공지 더 보기</Text></TouchableOpacity> : null}
    ListEmptyComponent={<Text style={styles.empty}>새 공지가 없습니다.</Text>}
    renderItem={({ item }) => <Card title={item.title}><Text>{item.content}</Text><Text style={styles.muted}>{new Date(item.createdAt).toLocaleString()}</Text>
      {(item.authorId === memberId || canManage) ? <View style={styles.memberActions}>{item.authorId === memberId ? <TouchableOpacity onPress={() => onEdit(item)}><Text style={styles.link}>수정</Text></TouchableOpacity> : null}<TouchableOpacity onPress={() => remove(item)}><Text style={styles.error}>삭제</Text></TouchableOpacity></View> : null}
      <View style={styles.reactions}>{Object.entries(item.emojis).filter(([, users]) => users.length > 0).map(([emoji, users]) => <TouchableOpacity key={emoji} accessibilityRole="button" accessibilityState={{ selected: users.includes(memberId) }} style={[styles.reaction, users.includes(memberId) && styles.reactionSelected]} onPress={() => void react(item, emoji)}><Text>{emoji} {users.length}</Text></TouchableOpacity>)}<TouchableOpacity accessibilityRole="button" style={styles.addReaction} onPress={() => { setCustomEmoji(""); setEmojiTarget(item); }}><Text style={styles.addReactionText}>＋</Text></TouchableOpacity></View></Card>}
    />
    <Modal visible={!!emojiTarget} transparent animationType="slide" onRequestClose={() => setEmojiTarget(undefined)}>
      <View style={styles.modalBackdrop}><TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setEmojiTarget(undefined)} /><View style={styles.emojiSheet}><View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>반응 추가</Text><Text style={styles.muted}>이모지를 선택하거나 직접 입력하세요.</Text><ScrollView contentContainerStyle={styles.emojiGrid}>{NOTICE_EMOJIS.map((emoji) => <TouchableOpacity key={emoji} accessibilityRole="button" style={styles.emojiOption} onPress={() => emojiTarget && void react(emojiTarget, emoji)}><Text style={styles.emojiText}>{emoji}</Text></TouchableOpacity>)}</ScrollView><View style={styles.customEmojiRow}><SeugiTextField value={customEmoji} onChangeText={setCustomEmoji} fieldStyle={styles.customEmojiField} style={styles.customEmojiInput} placeholder="다른 이모지 입력" maxLength={16} /><Button label="추가" onPress={() => emojiTarget && customEmoji.trim() && void react(emojiTarget, customEmoji.trim())} disabled={!customEmoji.trim()} /></View></View></View>
    </Modal></>;
}

const NOTICE_EMOJIS = ["👍", "👎", "❤️", "😍", "😂", "😮", "😢", "😡", "🙏", "👏", "🎉", "🔥", "💯", "✅", "⭐", "😊", "🤣", "🥰", "🤔", "💪", "🙌", "👀", "✨", "☕", "🌱", "📚", "💡", "🎂", "🎁", "🏆", "😆", "😳", "😤", "👌"];

export function NoticeEditorScreen({ workspace, initial, onSaved, onCancel }: { workspace: Workspace; initial?: Notification; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!title.trim() || !content.trim() || busy) return;
    setBusy(true); setNotice("");
    try {
      if (initial) await api.updateNotification({ id: initial.id, title: title.trim(), content: content.trim() });
      else await api.createNotification({ workspaceId: workspace.id, title: title.trim(), content: content.trim() });
      if (!initial) { setTitle(""); setContent(""); }
      await onSaved();
    } catch (e) { setNotice(e instanceof Error ? e.message : initial ? "공지를 수정하지 못했습니다" : "공지를 등록하지 못했습니다"); }
    finally { setBusy(false); }
  };
  return <View style={styles.editorScreen}>
    <SeugiTopBar
      leading={<TouchableOpacity accessibilityRole="button" accessibilityLabel="뒤로" onPress={onCancel} disabled={busy}><Text style={styles.editorBack}>‹</Text></TouchableOpacity>}
      title={<Text style={styles.editorTitle}>{initial ? "공지 수정" : "새 공지 작성"}</Text>}
      trailing={<TouchableOpacity accessibilityRole="button" onPress={() => void submit()} disabled={busy || !title.trim() || !content.trim()}><Text style={[styles.editorDone, (busy || !title.trim() || !content.trim()) && styles.editorDoneDisabled]}>{busy ? "저장 중…" : "완료"}</Text></TouchableOpacity>}
    />
    <ScrollView style={styles.editorScroll} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.editorFields}>
      <SeugiTextField value={title} onChangeText={setTitle} containerStyle={styles.editorField} placeholder="제목을 입력해 주세요" editable={!busy} returnKeyType="next" />
      <SeugiTextField value={content} onChangeText={setContent} containerStyle={styles.editorField} fieldStyle={styles.noticeBodyField} style={styles.noticeBodyInput} placeholder="내용을 입력해 주세요" multiline editable={!busy} />
      {notice ? <Text style={styles.error}>{notice}</Text> : null}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 16 },
  editorScreen: { flex: 1, backgroundColor: SeugiColor.White },
  editorScroll: { flex: 1 },
  editorFields: { paddingHorizontal: 20, paddingTop: 6 },
  editorTitle: { color: SeugiColor.Gray800, fontSize: 18, fontWeight: "700" },
  editorBack: { color: SeugiColor.Gray700, fontSize: 30, lineHeight: 34 },
  editorDone: { color: SeugiColor.Gray800, fontSize: 14, paddingVertical: 9, paddingHorizontal: 12 },
  editorDoneDisabled: { color: SeugiColor.Gray300 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  empty: { color: SeugiColor.Gray600, textAlign: "center", padding: 30 },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
  editorField: { marginBottom: 10 },
  noticeBodyField: { minHeight: 360, height: undefined, alignItems: "flex-start" },
  noticeBodyInput: { minHeight: 360, paddingTop: 14, paddingBottom: 14, textAlignVertical: "top" },
  link: { color: SeugiColor.Primary500 },
  memberActions: { flexDirection: "row", gap: 14 },
  reactions: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingTop: 6 },
  loader: { padding: 16 },
  loadMore: { alignItems: "center", paddingVertical: 18 },
  reaction: { borderWidth: 1, borderColor: SeugiColor.Gray100, backgroundColor: SeugiColor.Gray100, borderRadius: 16, paddingHorizontal: 9, paddingVertical: 5 },
  reactionSelected: { borderColor: SeugiColor.Primary500, backgroundColor: SeugiColor.Primary050 },
  addReaction: { width: 34, height: 30, borderWidth: 1, borderColor: SeugiColor.Gray300, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  addReactionText: { color: SeugiColor.Gray600, fontSize: 18, lineHeight: 20 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.32)" },
  modalDismiss: { flex: 1 },
  emojiSheet: { maxHeight: "58%", backgroundColor: SeugiColor.White, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: SeugiColor.Gray300, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: SeugiColor.Gray800, marginBottom: 4 },
  emojiGrid: { flexDirection: "row", flexWrap: "wrap", paddingVertical: 14 },
  emojiOption: { width: "12.5%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  emojiText: { fontSize: 26 },
  customEmojiRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  customEmojiField: { flex: 1, minHeight: 42, height: 42, borderRadius: 10 },
  customEmojiInput: { paddingHorizontal: 12 },
});
