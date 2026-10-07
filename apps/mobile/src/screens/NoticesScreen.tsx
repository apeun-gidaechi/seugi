import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { Notification, Workspace } from "@seugi/contracts";
import { Button, Card } from "../components/ui";
import { api } from "../services/api";

export function NoticesScreen({ workspace, onCreate, onEdit }: { workspace: Workspace; onCreate: () => void; onEdit: (notice: Notification) => void }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState("");
  const [memberId, setMemberId] = useState("");
  const [canPost, setCanPost] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [emojiTarget, setEmojiTarget] = useState<Notification>();
  const [customEmoji, setCustomEmoji] = useState("");
  const refresh = useCallback(() => api.notifications(workspace.id).then((x) => setItems(x.data ?? [])).catch((e) => setError(e instanceof Error ? e.message : "공지를 불러오지 못했습니다")), [workspace.id]);
  useEffect(() => {
    refresh();
    let active = true;
    Promise.all([api.memberInfo(), api.myProfile(workspace.id)]).then(([member, profile]) => {
      if (!active) return;
      setMemberId(member.data?.id ?? "");
      setCanManage(workspace.ownerId === member.data?.id || ["ADMIN", "MIDDLE_ADMIN"].includes(profile.data?.role ?? ""));
      setCanPost(workspace.ownerId === member.data?.id || (!!profile.data?.role && profile.data.role !== "STUDENT"));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [refresh, workspace.id, workspace.ownerId]);
  const react = async (item: Notification, emoji: string) => {
    try { await api.toggleNotificationEmoji(item.id, emoji); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "반응을 저장하지 못했습니다"); }
    finally { setEmojiTarget(undefined); }
  };
  const remove = (item: Notification) => Alert.alert("공지 삭제", `‘${item.title}’ 공지를 삭제할까요?`, [
    { text: "취소", style: "cancel" },
    { text: "삭제", style: "destructive", onPress: () => { void api.deleteNotification(workspace.id, item.id).then(refresh).catch((e) => setError(e instanceof Error ? e.message : "공지를 삭제하지 못했습니다")); } },
  ]);
  return <><FlatList style={styles.content} data={items} keyExtractor={(item) => item.id}
    ListHeaderComponent={<>{canPost ? <Card title="공지 관리"><Button label="공지 작성" onPress={onCreate} /></Card> : null}{error ? <Text style={styles.error}>{error}</Text> : null}</>}
    ListEmptyComponent={<Text style={styles.empty}>새 공지가 없습니다.</Text>}
    renderItem={({ item }) => <Card title={item.title}><Text>{item.content}</Text><Text style={styles.muted}>{new Date(item.createdAt).toLocaleString()}</Text>
      {(item.authorId === memberId || canManage) ? <View style={styles.memberActions}>{item.authorId === memberId ? <TouchableOpacity onPress={() => onEdit(item)}><Text style={styles.link}>수정</Text></TouchableOpacity> : null}<TouchableOpacity onPress={() => remove(item)}><Text style={styles.error}>삭제</Text></TouchableOpacity></View> : null}
      <View style={styles.reactions}>{Object.entries(item.emojis).filter(([, users]) => users.length > 0).map(([emoji, users]) => <TouchableOpacity key={emoji} accessibilityRole="button" accessibilityState={{ selected: users.includes(memberId) }} style={[styles.reaction, users.includes(memberId) && styles.reactionSelected]} onPress={() => void react(item, emoji)}><Text>{emoji} {users.length}</Text></TouchableOpacity>)}<TouchableOpacity accessibilityRole="button" style={styles.addReaction} onPress={() => { setCustomEmoji(""); setEmojiTarget(item); }}><Text style={styles.addReactionText}>＋</Text></TouchableOpacity></View></Card>}
    />
    <Modal visible={!!emojiTarget} transparent animationType="slide" onRequestClose={() => setEmojiTarget(undefined)}>
      <View style={styles.modalBackdrop}><TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setEmojiTarget(undefined)} /><View style={styles.emojiSheet}><View style={styles.sheetHandle} /><Text style={styles.sheetTitle}>반응 추가</Text><Text style={styles.muted}>이모지를 선택하거나 직접 입력하세요.</Text><ScrollView contentContainerStyle={styles.emojiGrid}>{NOTICE_EMOJIS.map((emoji) => <TouchableOpacity key={emoji} accessibilityRole="button" style={styles.emojiOption} onPress={() => emojiTarget && void react(emojiTarget, emoji)}><Text style={styles.emojiText}>{emoji}</Text></TouchableOpacity>)}</ScrollView><View style={styles.customEmojiRow}><TextInput value={customEmoji} onChangeText={setCustomEmoji} style={[styles.input, styles.customEmojiInput]} placeholder="다른 이모지 입력" maxLength={16} /><Button label="추가" onPress={() => emojiTarget && customEmoji.trim() && void react(emojiTarget, customEmoji.trim())} disabled={!customEmoji.trim()} /></View></View></View>
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
  return <View style={styles.content}><Card title={initial ? "공지 수정" : "공지 작성"}><TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="제목" /><TextInput value={content} onChangeText={setContent} style={styles.input} placeholder="공지 내용" multiline />
    <Button label={busy ? "저장 중…" : initial ? "수정 저장" : "공지 등록"} onPress={submit} disabled={busy || !title.trim() || !content.trim()} /><Button label="취소" kind="secondary" onPress={onCancel} disabled={busy} />{notice ? <Text style={styles.error}>{notice}</Text> : null}</Card></View>;
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 16 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  empty: { color: SeugiColor.Gray600, textAlign: "center", padding: 30 },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
  input: { backgroundColor: SeugiColor.White, borderWidth: 1, borderColor: SeugiColor.Gray300, borderRadius: 10, padding: 13, marginBottom: 10 },
  link: { color: SeugiColor.Primary500 },
  memberActions: { flexDirection: "row", gap: 14 },
  reactions: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingTop: 6 },
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
  customEmojiInput: { flex: 1, marginBottom: 0 },
});
