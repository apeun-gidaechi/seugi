import { useEffect, useState } from "react";
import { Alert, BackHandler, FlatList, Image, Linking, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { SeugiColor } from "@seugi/design-tokens";
import { CHAT_EMOJIS, type ChatMessage, type ChatMessageDeletedEvent, type ChatMessageEmojiEvent, type Room } from "@seugi/contracts";
import { Button } from "../components/ui";
import { ChatRoomManagement } from "../components/ChatRoomManagement";
import { api } from "../services/api";
import { API_URL } from "../config";
import { createAuthenticatedSocket } from "../realtime";
import { absoluteApiUrl } from "../utils/url";

export function ChatConversationScreen({ room, onBack, onOpenRoom }: { room: Room; onBack: () => void; onOpenRoom: (room: Room) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]); const [memberId, setMemberId] = useState(""); const [currentRoom, setCurrentRoom] = useState(room); const [manageMembers, setManageMembers] = useState(false); const [draft, setDraft] = useState(""); const [sending, setSending] = useState(false); const [uploading, setUploading] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false); const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>();
  const [imageDraft, setImageDraft] = useState<DocumentPicker.DocumentPickerAsset>();
  const [fileDraft, setFileDraft] = useState<DocumentPicker.DocumentPickerAsset>();
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [failedOutgoing, setFailedOutgoing] = useState<Array<{ id: string; message: string; files: string[]; type: "MESSAGE" | "IMG" | "FILE" }>>([]);
  useEffect(() => {
    if (!searchMode) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => { setSearchMode(false); setSearchText(""); return true; });
    return () => subscription.remove();
  }, [searchMode]);
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
  const deliver = (message: string, files: string[] = [], type: "MESSAGE" | "IMG" | "FILE" = "MESSAGE", retryId?: string) => {
    if ((!message.trim() && !files.length) || sending) return;
    setSending(true);
    let socket: ReturnType<typeof createAuthenticatedSocket>;
    let finished = false;
    const finish = (result: { message: string }) => {
      if (finished) return;
      finished = true;
      setSending(false);
      socket.close();
      if (result.message === "메시지 전송 성공") {
        setDraft("");
        if (retryId) setFailedOutgoing((items) => items.filter((item) => item.id !== retryId));
        if (type === "IMG") setImageDraft(undefined);
        if (type === "FILE") setFileDraft(undefined);
      } else {
        setFailedOutgoing((items) => retryId
          ? items.map((item) => item.id === retryId ? { ...item, message, files, type } : item)
          : [...items, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, message, files, type }]);
        Alert.alert("전송 실패", result.message);
      }
    };
    socket = createAuthenticatedSocket(api, API_URL, () => finish({ message: "세션을 갱신할 수 없습니다" }));
    socket.once("connect_error", (error) => { if (error.message !== "UNAUTHORIZED") finish({ message: "채팅 서버에 연결하지 못했습니다" }); });
    socket.once("connect", () => { socket.emit("room:join", room.id); socket.emit("chat:message", { roomId: room.id, message, files, type }, finish); });
  };
  const send = () => deliver(draft.trim());
  const attachFile = async () => { setShowAttachmentOptions(false); if (uploading || sending) return; try { const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false }); if (!result.canceled && result.assets[0]) setFileDraft(result.assets[0]); } catch (error) { Alert.alert("파일을 불러오지 못했습니다", error instanceof Error ? error.message : "다시 시도해 주세요"); } };
  const sendFile = async () => { if (!fileDraft || uploading || sending) return; setUploading(true); try { const form = new FormData(); form.append("file", { uri: fileDraft.uri, name: fileDraft.name, type: fileDraft.mimeType ?? "application/octet-stream" } as unknown as Blob); const uploaded = await api.uploadFile("FILE", form); if (!uploaded.data?.url) throw new Error("파일 업로드 응답이 올바르지 않습니다"); deliver(`${uploaded.data.url}::${fileDraft.name}::${fileDraft.size ?? uploaded.data.size}`, [], "FILE"); } catch (error) { Alert.alert("파일 전송 실패", error instanceof Error ? error.message : "다시 시도해 주세요"); } finally { setUploading(false); } };
  const selectImage = async () => { setShowAttachmentOptions(false); if (uploading || sending) return; try { const result = await DocumentPicker.getDocumentAsync({ type: "image/*", copyToCacheDirectory: true, multiple: false }); if (!result.canceled && result.assets[0]) setImageDraft(result.assets[0]); } catch (error) { Alert.alert("사진을 불러오지 못했습니다", error instanceof Error ? error.message : "다시 시도해 주세요"); } };
  const sendImage = async () => { if (!imageDraft || uploading || sending) return; setUploading(true); try { const form = new FormData(); form.append("file", { uri: imageDraft.uri, name: imageDraft.name, type: imageDraft.mimeType ?? "image/jpeg" } as unknown as Blob); const uploaded = await api.uploadFile("IMG", form); if (!uploaded.data?.url) throw new Error("이미지 업로드 응답이 올바르지 않습니다"); deliver(`${uploaded.data.url}::${imageDraft.name}`, [], "IMG"); } catch (error) { Alert.alert("사진 전송 실패", error instanceof Error ? error.message : "다시 시도해 주세요"); } finally { setUploading(false); } };
  const openFile = (url: string) => { Linking.openURL(absoluteApiUrl(url)).catch(() => Alert.alert("파일을 열지 못했습니다", "네트워크 연결을 확인해 주세요")); };
  const react = async (message: ChatMessage, emoji: string) => { const current = message.emojis[emoji] ?? []; try { if (current.includes(memberId)) await api.removeMessageEmoji(message.id, emoji); else await api.addMessageEmoji(message.id, emoji); setMessages((items) => items.map((item) => item.id !== message.id ? item : { ...item, emojis: { ...item.emojis, [emoji]: current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId] } })); } catch (e) { Alert.alert("반응을 저장하지 못했습니다", e instanceof Error ? e.message : "다시 시도해 주세요"); } };
  const removeMessage = (message: ChatMessage) => Alert.alert("메시지 삭제", "이 메시지를 대화방의 모든 구성원에게서 삭제할까요?", [{ text: "취소", style: "cancel" }, { text: "삭제", style: "destructive", onPress: () => { void api.deleteMessage(room.id, message.id).then(() => setMessages((items) => items.map((item) => item.id === message.id ? { ...item, message: "", files: undefined, messageStatus: "DELETE" } : item))).catch((error) => Alert.alert("메시지를 삭제하지 못했습니다", error instanceof Error ? error.message : "다시 시도해 주세요")); } }]);
  const closeSearch = () => { setSearchMode(false); setSearchText(""); };
  const back = () => { if (searchMode) closeSearch(); else onBack(); };
  const visibleMessages = messages.filter((item) => {
    if (!searchText.trim()) return true;
    if (item.messageStatus === "DELETE") return false;
    const query = searchText.trim().toLocaleLowerCase();
    return [item.message, ...(item.files ?? [])].some((part) => part.toLocaleLowerCase().includes(query));
  });
  return <View style={styles.chatPage}>
    <View style={styles.chatHeader}><TouchableOpacity onPress={back}><Text style={styles.link}>{searchMode ? "취소" : "‹ 목록"}</Text></TouchableOpacity>{searchMode ? <TextInput autoFocus value={searchText} onChangeText={setSearchText} placeholder="메시지, 이미지, 파일 검색" style={styles.searchInput} returnKeyType="search" /> : <Text numberOfLines={1} style={[styles.rowTitle, styles.chatTitle]}>{currentRoom.name}</Text>}{searchMode ? <TouchableOpacity onPress={closeSearch}><Text style={styles.link}>완료</Text></TouchableOpacity> : <><TouchableOpacity onPress={() => setSearchMode(true)}><Text style={styles.link}>⌕</Text></TouchableOpacity>{currentRoom.type === "GROUP" ? <TouchableOpacity onPress={() => setManageMembers((value) => !value)}><Text style={styles.link}>{manageMembers ? "닫기" : "구성원"}</Text></TouchableOpacity> : null}</>}</View>
    {manageMembers ? <ChatRoomManagement room={currentRoom} memberId={memberId} onRoomChange={setCurrentRoom} onLeave={onBack} onOpenPersonalChat={(nextRoom) => { setManageMembers(false); onOpenRoom(nextRoom); }} /> : <>
      <FlatList style={styles.content} data={visibleMessages} keyExtractor={(item) => item.id} ListEmptyComponent={searchText.trim() ? <Text style={styles.emptySearch}>검색 결과가 없습니다.</Text> : null} ListHeaderComponent={hasOlderMessages ? <Button label={loadingOlderMessages ? "불러오는 중…" : "이전 대화 불러오기"} kind="secondary" onPress={() => void loadOlderMessages()} disabled={loadingOlderMessages} /> : null}
        ListFooterComponent={failedOutgoing.length ? <View>{failedOutgoing.map((failed) => <View key={failed.id} style={styles.failedMessage}><View style={styles.failedMessageText}><Text style={styles.error}>메시지를 보내지 못했습니다.</Text><Text numberOfLines={2} style={styles.muted}>{failed.type === "IMG" ? "사진 첨부" : failed.type === "FILE" ? "파일 첨부" : failed.message}</Text></View><TouchableOpacity disabled={sending} onPress={() => deliver(failed.message, failed.files, failed.type, failed.id)}><Text style={styles.link}>{sending ? "재전송 중…" : "재전송"}</Text></TouchableOpacity><TouchableOpacity disabled={sending} onPress={() => setFailedOutgoing((items) => items.filter((item) => item.id !== failed.id))}><Text style={styles.muted}>닫기</Text></TouchableOpacity></View>)}</View> : null}
        renderItem={({ item }) => {
          const parts = item.message.split("::");
          const imageUrl = item.type === "IMG" ? parts[0] : undefined;
          const fileUrl = item.type === "FILE" ? parts[0] : undefined;
          const fileName = item.type === "FILE" ? parts[1] : undefined;
          return <View style={styles.message}>
            {item.messageStatus === "DELETE" ? <Text style={styles.muted}>메시지가 삭제되었습니다.</Text> : <>
              {imageUrl ? <TouchableOpacity onPress={() => setPreviewImage(imageUrl)}><Image source={{ uri: absoluteApiUrl(imageUrl) }} resizeMode="cover" style={styles.imageMessage} /></TouchableOpacity> : null}
              {fileUrl ? <TouchableOpacity onPress={() => openFile(fileUrl)} style={styles.fileMessage}><Text style={styles.fileIcon}>↧</Text><View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.rowTitle}>{fileName || "첨부 파일"}</Text><Text style={styles.link}>파일 열기 ↗</Text></View></TouchableOpacity> : null}
              {visibleMessage(item) && !imageUrl && !fileUrl ? <Text>{visibleMessage(item)}</Text> : null}
              {item.files?.map((url) => <TouchableOpacity key={url} onPress={() => /\.(?:png|jpe?g|gif|webp|heic|bmp)(?:[?#]|$)/i.test(url) ? setPreviewImage(url) : openFile(url)}><Text style={styles.link}>{/\.(?:png|jpe?g|gif|webp|heic|bmp)(?:[?#]|$)/i.test(url) ? "이미지 미리보기" : "첨부 파일 열기 ↗"}</Text></TouchableOpacity>)}
            </>}
            <View style={styles.row}><Text style={styles.muted}>{new Date(item.createdAt).toLocaleTimeString()}</Text>{item.senderId === memberId && item.messageStatus !== "DELETE" ? <TouchableOpacity onPress={() => removeMessage(item)}><Text style={styles.error}>삭제</Text></TouchableOpacity> : null}</View>
            {item.messageStatus !== "DELETE" ? <View style={styles.reactions}>{CHAT_EMOJIS.map((emoji) => <TouchableOpacity key={emoji} onPress={() => react(item, emoji)}><Text>{emoji} {(item.emojis[emoji] ?? []).length}</Text></TouchableOpacity>)}</View> : null}
          </View>;
        }}
      />
      <View style={styles.composer}><TouchableOpacity onPress={() => setShowAttachmentOptions(true)} disabled={uploading || sending}><Text style={styles.link}>{uploading ? "업로드 중…" : "＋ 첨부"}</Text></TouchableOpacity><TextInput value={draft} onChangeText={setDraft} placeholder="메시지 입력" style={[styles.input, styles.composerInput]} onSubmitEditing={send} /><Button label={sending ? "…" : "전송"} onPress={send} disabled={sending || !draft.trim()} /></View>
    </>}
    <Modal visible={showAttachmentOptions} transparent animationType="slide" onRequestClose={() => setShowAttachmentOptions(false)}><View style={styles.sheetBackdrop}><TouchableOpacity style={styles.sheetDismiss} activeOpacity={1} onPress={() => setShowAttachmentOptions(false)} /><View style={styles.attachmentSheet}><Text style={styles.sheetTitle}>첨부하기</Text><TouchableOpacity style={styles.attachmentOption} onPress={() => void selectImage()}><Text style={styles.attachmentIcon}>▧</Text><Text style={styles.rowTitle}>사진 또는 이미지</Text></TouchableOpacity><TouchableOpacity style={styles.attachmentOption} onPress={() => void attachFile()}><Text style={styles.attachmentIcon}>↧</Text><Text style={styles.rowTitle}>파일</Text></TouchableOpacity></View></View></Modal>
    <Modal visible={!!imageDraft} transparent animationType="fade" onRequestClose={() => setImageDraft(undefined)}><View style={styles.imagePreviewBackdrop}><View style={styles.imagePreviewHeader}><TouchableOpacity onPress={() => setImageDraft(undefined)}><Text style={styles.previewButton}>취소</Text></TouchableOpacity><Text style={styles.previewTitle}>사진 미리보기</Text><TouchableOpacity onPress={() => void sendImage()} disabled={uploading || sending}><Text style={[styles.previewButton, (uploading || sending) && styles.disabledText]}>{uploading ? "전송 중…" : "전송"}</Text></TouchableOpacity></View>{imageDraft ? <Image source={{ uri: imageDraft.uri }} resizeMode="contain" style={styles.imagePreview} /> : null}</View></Modal>
    <Modal visible={!!fileDraft} transparent animationType="fade" onRequestClose={() => setFileDraft(undefined)}><View style={styles.sheetBackdrop}><TouchableOpacity style={styles.sheetDismiss} activeOpacity={1} onPress={() => setFileDraft(undefined)} /><View style={styles.filePreviewSheet}><Text style={styles.sheetTitle}>파일 전송</Text><View style={styles.filePreviewRow}><Text style={styles.fileIcon}>↧</Text><View style={{ flex: 1 }}><Text numberOfLines={2} style={styles.rowTitle}>{fileDraft?.name}</Text><Text style={styles.muted}>{fileDraft?.size ? formatFileSize(fileDraft.size) : "크기 확인 불가"}</Text></View></View><View style={styles.filePreviewActions}><Button label="취소" kind="secondary" onPress={() => setFileDraft(undefined)} disabled={uploading || sending} /><Button label={uploading ? "전송 중…" : "전송"} onPress={() => void sendFile()} disabled={uploading || sending} /></View></View></View></Modal>
    <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(undefined)}><TouchableOpacity activeOpacity={1} onPress={() => setPreviewImage(undefined)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.94)", alignItems: "center", justifyContent: "center", padding: 16 }}><Text style={{ position: "absolute", top: 56, right: 20, color: SeugiColor.White, fontSize: 18 }}>닫기 ✕</Text>{previewImage ? <Image source={{ uri: absoluteApiUrl(previewImage) }} resizeMode="contain" style={{ width: "100%", height: "82%" }} /> : null}</TouchableOpacity></Modal>
  </View>;
}

function visibleMessage(message: ChatMessage) { if (message.type !== "BOT") return message.message; try { const value = JSON.parse(message.message) as { data?: unknown }; return typeof value.data === "string" ? value.data : message.message; } catch { return message.message; } }
function formatFileSize(size: number) { if (size < 1024) return `${size} B`; if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`; return `${(size / (1024 * 1024)).toFixed(1)} MB`; }

const styles = StyleSheet.create({
  chatPage: { flex: 1 },
  chatHeader: { backgroundColor: SeugiColor.White, padding: 16, flexDirection: "row", gap: 16, alignItems: "center" },
  chatTitle: { flex: 1 },
  searchInput: { flex: 1, minWidth: 0, paddingVertical: 8, color: SeugiColor.Gray800 },
  emptySearch: { textAlign: "center", color: SeugiColor.Gray500, padding: 28 },
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
  imageMessage: { width: 220, height: 220, maxWidth: "100%", borderRadius: 10, backgroundColor: SeugiColor.Gray100 },
  fileMessage: { minWidth: 210, maxWidth: 270, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: SeugiColor.Gray100, borderRadius: 10, padding: 12 },
  fileIcon: { fontSize: 24, color: SeugiColor.Primary500 },
  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.32)" },
  sheetDismiss: { flex: 1 },
  attachmentSheet: { backgroundColor: SeugiColor.White, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, paddingBottom: 32, gap: 8 },
  sheetTitle: { color: SeugiColor.Gray800, fontSize: 17, fontWeight: "700", marginBottom: 8 },
  attachmentOption: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 14, borderTopWidth: 1, borderColor: SeugiColor.Gray100 },
  attachmentIcon: { color: SeugiColor.Primary500, fontSize: 22, width: 28, textAlign: "center" },
  imagePreviewBackdrop: { flex: 1, backgroundColor: "#101010", paddingTop: 52, paddingBottom: 24 },
  imagePreviewHeader: { height: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 },
  previewButton: { color: SeugiColor.White, fontSize: 16 },
  previewTitle: { color: SeugiColor.White, fontSize: 16, fontWeight: "600" },
  disabledText: { opacity: 0.5 },
  imagePreview: { flex: 1, width: "100%", marginTop: 12 },
  failedMessage: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: SeugiColor.White, borderWidth: 1, borderColor: SeugiColor.Red500, borderRadius: 12, padding: 12, marginTop: 8 },
  failedMessageText: { flex: 1, gap: 4 },
  filePreviewSheet: { backgroundColor: SeugiColor.White, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, paddingBottom: 32, gap: 16 },
  filePreviewRow: { flexDirection: "row", alignItems: "center", backgroundColor: SeugiColor.Gray100, borderRadius: 12, padding: 14, gap: 12 },
  filePreviewActions: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
});
