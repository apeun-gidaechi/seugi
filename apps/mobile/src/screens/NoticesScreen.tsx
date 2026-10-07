import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { Notification, Workspace } from "@seugi/contracts";
import { Button, Card } from "../components/ui";
import { api } from "../services/api";

export function NoticesScreen({ workspace }: { workspace: Workspace }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [error, setError] = useState("");
  const [memberId, setMemberId] = useState("");
  const [canPost, setCanPost] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [editing, setEditing] = useState<Notification>();
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
  };
  const remove = (item: Notification) => Alert.alert("공지 삭제", `‘${item.title}’ 공지를 삭제할까요?`, [
    { text: "취소", style: "cancel" },
    { text: "삭제", style: "destructive", onPress: () => { void api.deleteNotification(workspace.id, item.id).then(refresh).catch((e) => setError(e instanceof Error ? e.message : "공지를 삭제하지 못했습니다")); } },
  ]);
  return <FlatList style={styles.content} data={items} keyExtractor={(item) => item.id}
    ListHeaderComponent={<>{editing ? <NoticeEditor key={editing.id} workspace={workspace} initial={editing} onCancel={() => setEditing(undefined)} onSaved={async () => { setEditing(undefined); await refresh(); }} /> : canPost ? <NoticeEditor workspace={workspace} onSaved={refresh} /> : null}{error ? <Text style={styles.error}>{error}</Text> : null}</>}
    ListEmptyComponent={<Text style={styles.empty}>새 공지가 없습니다.</Text>}
    renderItem={({ item }) => <Card title={item.title}><Text>{item.content}</Text><Text style={styles.muted}>{new Date(item.createdAt).toLocaleString()}</Text>
      {(item.authorId === memberId || canManage) ? <View style={styles.memberActions}>{item.authorId === memberId ? <TouchableOpacity onPress={() => setEditing(item)}><Text style={styles.link}>수정</Text></TouchableOpacity> : null}<TouchableOpacity onPress={() => remove(item)}><Text style={styles.error}>삭제</Text></TouchableOpacity></View> : null}
      <View style={styles.reactions}>{["👍", "❤️", "🎉"].map((emoji) => <TouchableOpacity key={emoji} onPress={() => react(item, emoji)}><Text>{emoji} {(item.emojis[emoji] ?? []).length}</Text></TouchableOpacity>)}</View></Card>} />;
}

function NoticeEditor({ workspace, initial, onSaved, onCancel }: { workspace: Workspace; initial?: Notification; onSaved: () => Promise<void>; onCancel?: () => void }) {
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
  return <Card title={initial ? "공지 수정" : "공지 작성"}><TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="제목" /><TextInput value={content} onChangeText={setContent} style={styles.input} placeholder="공지 내용" multiline />
    <Button label={busy ? "저장 중…" : initial ? "수정 저장" : "공지 등록"} onPress={submit} disabled={busy || !title.trim() || !content.trim()} />{onCancel ? <Button label="취소" kind="secondary" onPress={onCancel} disabled={busy} /> : null}{notice ? <Text style={styles.error}>{notice}</Text> : null}</Card>;
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
});
