import { useEffect, useState, type ComponentType } from "react";
import { Alert, FlatList, Image, Linking, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { SeugiColor } from "@seugi/design-tokens";
import { CHAT_EMOJIS, type ChatMessage, type ChatMessageDeletedEvent, type ChatMessageEmojiEvent, type Room } from "@seugi/contracts";
import { Button } from "../components/ui";
import { api } from "../services/api";
import { API_URL } from "../config";
import { createAuthenticatedSocket } from "../realtime";
import { absoluteApiUrl } from "../utils/url";

type RoomManagementProps = { room: Room; memberId: string; onRoomChange: (room: Room) => void; onLeave: () => void };

export function ChatConversationScreen({ room, onBack, RoomManagementComponent }: { room: Room; onBack: () => void; RoomManagementComponent: ComponentType<RoomManagementProps> }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]); const [memberId, setMemberId] = useState(""); const [currentRoom, setCurrentRoom] = useState(room); const [manageMembers, setManageMembers] = useState(false); const [draft, setDraft] = useState(""); const [sending, setSending] = useState(false); const [uploading, setUploading] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false); const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>();
  useEffect(() => { let active = true; const socket = createAuthenticatedSocket(api, API_URL, () => Alert.alert("세션 오류", "세션을 갱신할 수 없습니다. 다시 로그인해주세요.")); api.messages(room.id).then((result) => { if (!active) return; setMessages((result.data?.messages ?? []).reverse()); setHasOlderMessages(result.data?.hasNext ?? false); }).catch(() => undefined); api.memberInfo().then((result) => active && setMemberId(result.data?.id ?? "")).catch(() => undefined); socket.on("connect", () => socket.emit("room:join", room.id)); socket.on("chat:message", (message: ChatMessage) => { if (message.roomId === room.id) setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]); }); socket.on("chat:message-deleted", (event: ChatMessageDeletedEvent) => { if (event.roomId === room.id) setMessages((current) => current.map((item) => item.id === event.messageId ? { ...item, message: "", files: undefined, messageStatus: "DELETE" } : item)); }); socket.on("chat:message-emoji", (event: ChatMessageEmojiEvent) => { if (event.roomId !== room.id) return; setMessages((current) => current.map((item) => { if (item.id !== event.messageId) return item; const users = item.emojis[event.emoji] ?? []; const nextUsers = event.action === "ADD" ? [...new Set([...users, event.senderId])] : users.filter((id) => id !== event.senderId); return { ...item, emojis: { ...item.emojis, [event.emoji]: nextUsers } }; })); }); return () => { active = false; socket.close(); }; }, [room.id]);
  const loadOlderMessages = async () => {
    const cursor = messages[0]?.createdAt;
    if (!cursor || !hasOlderMessages || loadingOlderMessages) return;
    setLoadingOlderMessages(true);
    try {
      const result = await api.messages(room.id, cursor);
      const older = (result.data?.messages ?? []).reverse();
      setMessages((current) => {
        const currentIds = new Set(current.map((item) => item.id));
        return [...older.filter((item) => !currentIds.has(item.id)), ...current];
      });
      setHasOlderMessages(result.data?.hasNext ?? false);
    } catch (error) {
      Alert.alert("이전 대화를 불러오지 못했습니다", error instanceof Error ? error.message : "네트워크 연결을 확인해 주세요");
    } finally { setLoadingOlderMessages(false); }
  };
  const deliver = (message: string, files: string[] = []) => { if ((!message.trim() && !files.length) || sending) return; setSending(true); let socket: ReturnType<typeof createAuthenticatedSocket>; const finish = (result: { message: string }) => { setSending(false); socket.close(); if (result.message === "메시지 전송 성공") setDraft(""); else Alert.alert("전송 실패", result.message); }; socket = createAuthenticatedSocket(api, API_URL, () => finish({ message: "세션을 갱신할 수 없습니다" })); socket.once("connect_error", (error) => { if (error.message !== "UNAUTHORIZED") finish({ message: "채팅 서버에 연결하지 못했습니다" }); }); socket.once("connect", () => { socket.emit("room:join", room.id); socket.emit("chat:message", { roomId: room.id, message, files }, finish); }); };
  const send = () => deliver(draft.trim());
  const attachFile = async () => { if (uploading || sending) return; setUploading(true); try { const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false }); if (result.canceled || !result.assets[0]) return; const file = result.assets[0]; const form = new FormData(); form.append("file", { uri: file.uri, name: file.name, type: file.mimeType ?? "application/octet-stream" } as unknown as Blob); const uploaded = await api.uploadFile("FILE", form); if (!uploaded.data?.url) throw new Error("파일 업로드 응답이 올바르지 않습니다"); deliver("", [uploaded.data.url]); } catch (error) { Alert.alert("파일 전송 실패", error instanceof Error ? error.message : "다시 시도해 주세요"); } finally { setUploading(false); } };
  const openFile = (url: string) => { Linking.openURL(absoluteApiUrl(url)).catch(() => Alert.alert("파일을 열지 못했습니다", "네트워크 연결을 확인해 주세요")); };
  const react = async (message: ChatMessage, emoji: string) => { const current = message.emojis[emoji] ?? []; try { if (current.includes(memberId)) await api.removeMessageEmoji(message.id, emoji); else await api.addMessageEmoji(message.id, emoji); setMessages((items) => items.map((item) => item.id !== message.id ? item : { ...item, emojis: { ...item.emojis, [emoji]: current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId] } })); } catch (e) { Alert.alert("반응을 저장하지 못했습니다", e instanceof Error ? e.message : "다시 시도해 주세요"); } };
  const removeMessage = (message: ChatMessage) => Alert.alert("메시지 삭제", "이 메시지를 대화방의 모든 구성원에게서 삭제할까요?", [{ text: "취소", style: "cancel" }, { text: "삭제", style: "destructive", onPress: () => { void api.deleteMessage(room.id, message.id).then(() => setMessages((items) => items.map((item) => item.id === message.id ? { ...item, message: "", files: undefined, messageStatus: "DELETE" } : item))).catch((error) => Alert.alert("메시지를 삭제하지 못했습니다", error instanceof Error ? error.message : "다시 시도해 주세요")); } }]);
  return <View style={styles.chatPage}><View style={styles.chatHeader}><TouchableOpacity onPress={onBack}><Text style={styles.link}>‹ 목록</Text></TouchableOpacity><Text style={styles.rowTitle}>{currentRoom.name}</Text>{currentRoom.type === "GROUP" ? <TouchableOpacity onPress={() => setManageMembers((value) => !value)}><Text style={styles.link}>{manageMembers ? "닫기" : "구성원"}</Text></TouchableOpacity> : null}</View>{manageMembers ? <RoomManagementComponent room={currentRoom} memberId={memberId} onRoomChange={setCurrentRoom} onLeave={onBack} /> : <><FlatList style={styles.content} data={messages} keyExtractor={(item) => item.id} ListHeaderComponent={hasOlderMessages ? <Button label={loadingOlderMessages ? "불러오는 중…" : "이전 대화 불러오기"} kind="secondary" onPress={() => void loadOlderMessages()} disabled={loadingOlderMessages} /> : null} renderItem={({ item }) => <View style={styles.message}>{item.messageStatus === "DELETE" ? <Text style={styles.muted}>메시지가 삭제되었습니다.</Text> : <>{visibleMessage(item) ? <Text>{visibleMessage(item)}</Text> : null}{item.files?.map((url) => <TouchableOpacity key={url} onPress={() => /\.(?:png|jpe?g|gif|webp|heic|bmp)(?:[?#]|$)/i.test(url) ? setPreviewImage(url) : openFile(url)}><Text style={styles.link}>{/\.(?:png|jpe?g|gif|webp|heic|bmp)(?:[?#]|$)/i.test(url) ? "이미지 미리보기" : "첨부 파일 열기 ↗"}</Text></TouchableOpacity>)}</>}<View style={styles.row}><Text style={styles.muted}>{new Date(item.createdAt).toLocaleTimeString()}</Text>{item.senderId === memberId && item.messageStatus !== "DELETE" ? <TouchableOpacity onPress={() => removeMessage(item)}><Text style={styles.error}>삭제</Text></TouchableOpacity> : null}</View>{item.messageStatus !== "DELETE" ? <View style={styles.reactions}>{CHAT_EMOJIS.map((emoji) => <TouchableOpacity key={emoji} onPress={() => react(item, emoji)}><Text>{emoji} {(item.emojis[emoji] ?? []).length}</Text></TouchableOpacity>)}</View> : null}</View>} /><View style={styles.composer}><TouchableOpacity onPress={attachFile} disabled={uploading || sending}><Text style={styles.link}>{uploading ? "업로드 중…" : "＋ 파일"}</Text></TouchableOpacity><TextInput value={draft} onChangeText={setDraft} placeholder="메시지 입력" style={[styles.input, styles.composerInput]} onSubmitEditing={send} /><Button label={sending ? "…" : "전송"} onPress={send} disabled={sending || !draft.trim()} /></View></>}
    <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(undefined)}><TouchableOpacity activeOpacity={1} onPress={() => setPreviewImage(undefined)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.94)", alignItems: "center", justifyContent: "center", padding: 16 }}><Text style={{ position: "absolute", top: 56, right: 20, color: SeugiColor.White, fontSize: 18 }}>닫기 ✕</Text>{previewImage ? <Image source={{ uri: absoluteApiUrl(previewImage) }} resizeMode="contain" style={{ width: "100%", height: "82%" }} /> : null}</TouchableOpacity></Modal>
  </View>;
}

function visibleMessage(message: ChatMessage) { if (message.type !== "BOT") return message.message; try { const value = JSON.parse(message.message) as { data?: unknown }; return typeof value.data === "string" ? value.data : message.message; } catch { return message.message; } }

const styles = StyleSheet.create({
  chatPage: { flex: 1 },
  chatHeader: { backgroundColor: SeugiColor.White, padding: 16, flexDirection: "row", gap: 16, alignItems: "center" },
  content: { flex: 1, padding: 16 },
  link: { color: SeugiColor.Primary500 },
  rowTitle: { fontWeight: "600" },
  message: { backgroundColor: SeugiColor.White, borderRadius: 12, padding: 12, marginBottom: 8, alignSelf: "flex-start", maxWidth: "85%" },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
  row: { backgroundColor: SeugiColor.White, padding: 16, marginBottom: 8, borderRadius: 12, flexDirection: "row", justifyContent: "space-between" },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  reactions: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingTop: 6 },
  composer: { flexDirection: "row", padding: 10, gap: 8, backgroundColor: SeugiColor.White, alignItems: "center" },
  input: { backgroundColor: SeugiColor.White, borderWidth: 1, borderColor: SeugiColor.Gray300, borderRadius: 10, padding: 13, marginBottom: 10 },
  composerInput: { flex: 1, marginBottom: 0 },
});
