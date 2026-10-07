import { useEffect, useState } from "react";
import { Alert, BackHandler, FlatList, Image, Linking, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { SeugiColor } from "@seugi/design-tokens";
import { CHAT_EMOJIS, type ChatMessage, type ChatMessageDeletedEvent, type ChatMessageEmojiEvent, type LegacyProfile, type Room } from "@seugi/contracts";
import { Button } from "../components/ui";
import { SeugiTextField } from "../design-system/TextField";
import { ZoomableImage } from "../components/ZoomableImage";
import { ChatRoomManagement } from "../components/ChatRoomManagement";
import { api } from "../services/api";
import { API_URL } from "../config";
import { createAuthenticatedSocket } from "../realtime";
import { absoluteApiUrl } from "../utils/url";
import { SeugiChatTextField } from "../design-system/TextField";

export function ChatConversationScreen({ room, onBack, onOpenRoom }: { room: Room; onBack: () => void; onOpenRoom: (room: Room) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]); const [memberId, setMemberId] = useState(""); const [currentRoom, setCurrentRoom] = useState(room); const [manageMembers, setManageMembers] = useState(false); const [draft, setDraft] = useState(""); const [sending, setSending] = useState(false); const [uploading, setUploading] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false); const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string }>();
  const [imageDraft, setImageDraft] = useState<DocumentPicker.DocumentPickerAsset>();
  const [fileDraft, setFileDraft] = useState<DocumentPicker.DocumentPickerAsset>();
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [otherProfile, setOtherProfile] = useState<LegacyProfile>();
  const [openingOtherChat, setOpeningOtherChat] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage>();
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
  const downloadFile = async (url: string, name?: string) => {
    if (Platform.OS === "web") {
      await Linking.openURL(absoluteApiUrl(url));
      return;
    }
    const directory = FileSystem.documentDirectory;
    if (!directory) throw new Error("파일 저장 위치를 확인할 수 없습니다");
    const fromUrl = url.split(/[?#]/, 1)[0]?.split("/").pop() || "첨부 파일";
    let decodedName = fromUrl;
    try { decodedName = decodeURIComponent(fromUrl); } catch { /* Keep the encoded path segment. */ }
    const safeName = (name || decodedName).replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim() || "첨부 파일";
    const destination = `${directory}${encodeURIComponent(safeName)}`;
    const existing = await FileSystem.getInfoAsync(destination);
    if (!existing.exists) {
      const result = await FileSystem.downloadAsync(absoluteApiUrl(url), destination);
      if (result.status < 200 || result.status >= 300) throw new Error(`다운로드에 실패했습니다 (${result.status})`);
    }
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(destination, { dialogTitle: safeName, mimeType: mimeTypeForName(safeName) });
    else Alert.alert("파일 저장 완료", `앱 문서에 저장했습니다: ${safeName}`);
  };
  const openFile = (url: string, name?: string) => {
    void downloadFile(url, name).catch((error) => Alert.alert("파일을 저장하지 못했습니다", error instanceof Error ? error.message : "네트워크 연결을 확인해 주세요"));
  };
  const openOtherProfile = async () => {
    const otherId = currentRoom.memberIds.find((id) => id !== memberId);
    if (!otherId) return;
    try { const result = await api.profileOfOther(currentRoom.workspaceId, otherId); setOtherProfile(result.data); }
    catch (error) { Alert.alert("프로필을 불러오지 못했습니다", error instanceof Error ? error.message : "다시 시도해 주세요"); }
  };
  const startChatWithOtherProfile = async () => {
    if (!otherProfile || openingOtherChat) return;
    setOpeningOtherChat(true);
    try {
      const created = await api.createRoom("personal", { workspaceId: currentRoom.workspaceId, name: "", memberIds: [otherProfile.member.id] });
      if (!created.data) throw new Error("채팅방을 열지 못했습니다");
      const result = await api.personalRoom(created.data);
      if (!result.data) throw new Error("채팅방 정보를 불러오지 못했습니다");
      setOtherProfile(undefined);
      onOpenRoom(result.data);
    } catch (error) {
      Alert.alert("개인 채팅을 시작하지 못했습니다", error instanceof Error ? error.message : "다시 시도해 주세요");
    } finally {
      setOpeningOtherChat(false);
    }
  };
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
    <View style={styles.chatHeader}><TouchableOpacity onPress={back}><Text style={styles.link}>{searchMode ? "취소" : "‹ 목록"}</Text></TouchableOpacity>{searchMode ? <SeugiTextField autoFocus value={searchText} onChangeText={setSearchText} placeholder="메시지, 이미지, 파일 검색" fieldStyle={styles.searchField} style={styles.searchInput} returnKeyType="search" /> : <Text numberOfLines={1} style={[styles.rowTitle, styles.chatTitle]}>{currentRoom.name}</Text>}{searchMode ? <TouchableOpacity onPress={closeSearch}><Text style={styles.link}>완료</Text></TouchableOpacity> : <><TouchableOpacity onPress={() => setSearchMode(true)}><Text style={styles.link}>⌕</Text></TouchableOpacity>{currentRoom.type === "GROUP" ? <TouchableOpacity onPress={() => setManageMembers((value) => !value)}><Text style={styles.link}>{manageMembers ? "닫기" : "구성원"}</Text></TouchableOpacity> : <TouchableOpacity accessibilityRole="button" onPress={() => void openOtherProfile()}><Text style={styles.link}>프로필</Text></TouchableOpacity>}</>}</View>
    {manageMembers ? <ChatRoomManagement room={currentRoom} memberId={memberId} onRoomChange={setCurrentRoom} onLeave={onBack} onOpenPersonalChat={(nextRoom) => { setManageMembers(false); onOpenRoom(nextRoom); }} /> : <>
      <FlatList style={styles.content} data={visibleMessages} keyExtractor={(item) => item.id} ListEmptyComponent={searchText.trim() ? <Text style={styles.emptySearch}>검색 결과가 없습니다.</Text> : null} ListHeaderComponent={hasOlderMessages ? <Button label={loadingOlderMessages ? "불러오는 중…" : "이전 대화 불러오기"} kind="secondary" onPress={() => void loadOlderMessages()} disabled={loadingOlderMessages} /> : null}
        ListFooterComponent={failedOutgoing.length ? <View>{failedOutgoing.map((failed) => <View key={failed.id} style={styles.failedMessage}><View style={styles.failedMessageText}><Text style={styles.error}>메시지를 보내지 못했습니다.</Text><Text numberOfLines={2} style={styles.muted}>{failed.type === "IMG" ? "사진 첨부" : failed.type === "FILE" ? "파일 첨부" : failed.message}</Text></View><TouchableOpacity disabled={sending} onPress={() => deliver(failed.message, failed.files, failed.type, failed.id)}><Text style={styles.link}>{sending ? "재전송 중…" : "재전송"}</Text></TouchableOpacity><TouchableOpacity disabled={sending} onPress={() => setFailedOutgoing((items) => items.filter((item) => item.id !== failed.id))}><Text style={styles.muted}>닫기</Text></TouchableOpacity></View>)}</View> : null}
        renderItem={({ item, index }) => {
          const parts = item.message.split("::");
          const imageUrl = item.type === "IMG" ? parts[0] : undefined;
          const fileUrl = item.type === "FILE" ? parts[0] : undefined;
          const fileName = item.type === "FILE" ? parts[1] : undefined;
          const ownMessage = item.senderId === memberId;
          const previous = visibleMessages[index - 1];
          const showDate = !previous || localDateKey(previous.createdAt) !== localDateKey(item.createdAt);
          const reactions = Object.entries(item.emojis).filter(([, users]) => users.length > 0);
          return <View>
            {showDate ? <Text style={styles.dateDivider}>{formatLocalDate(item.createdAt)}</Text> : null}
            <TouchableOpacity activeOpacity={1} onLongPress={() => item.messageStatus !== "DELETE" && setSelectedMessage(item)} style={[styles.message, ownMessage ? styles.ownMessage : styles.otherMessage]}>
            {item.messageStatus === "DELETE" ? <Text style={styles.muted}>메시지가 삭제되었습니다.</Text> : <>
              {imageUrl ? <TouchableOpacity onPress={() => setPreviewImage({ url: imageUrl, name: parts[1] || "채팅 이미지" })}><Image source={{ uri: absoluteApiUrl(imageUrl) }} resizeMode="cover" style={styles.imageMessage} /></TouchableOpacity> : null}
              {fileUrl ? <TouchableOpacity onPress={() => openFile(fileUrl, fileName)} style={styles.fileMessage}><Text style={styles.fileIcon}>↧</Text><View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.rowTitle}>{fileName || "첨부 파일"}</Text><Text style={styles.link}>파일 저장/공유 ↗</Text></View></TouchableOpacity> : null}
              {visibleMessage(item) && !imageUrl && !fileUrl ? <Text>{visibleMessage(item)}</Text> : null}
              {item.files?.map((url) => <TouchableOpacity key={url} onPress={() => /\.(?:png|jpe?g|gif|webp|heic|bmp)(?:[?#]|$)/i.test(url) ? setPreviewImage({ url, name: fileNameFromUrl(url) }) : openFile(url)}><Text style={styles.link}>{/\.(?:png|jpe?g|gif|webp|heic|bmp)(?:[?#]|$)/i.test(url) ? "이미지 미리보기" : "첨부 파일 저장/공유 ↗"}</Text></TouchableOpacity>)}
            </>}
            <View style={styles.messageMeta}><Text style={styles.muted}>{formatLocalTime(item.createdAt)}</Text>{ownMessage && item.messageStatus !== "DELETE" ? <TouchableOpacity onPress={() => removeMessage(item)}><Text style={styles.error}>삭제</Text></TouchableOpacity> : null}</View>
            {item.messageStatus !== "DELETE" && reactions.length ? <View style={styles.reactions}>{reactions.map(([emoji, users]) => <TouchableOpacity key={emoji} onPress={() => react(item, emoji)}><Text>{emoji} {users.length}</Text></TouchableOpacity>)}</View> : null}
            </TouchableOpacity>
          </View>;
        }}
      />
      <SeugiChatTextField value={draft} onChangeText={setDraft} placeholder="메시지 입력" onAddClick={() => setShowAttachmentOptions(true)} onSendClick={() => void send()} sendEnabled={!sending && !!draft.trim()} editable={!sending} />
    </>}
    <Modal visible={showAttachmentOptions} transparent animationType="slide" onRequestClose={() => setShowAttachmentOptions(false)}><View style={styles.sheetBackdrop}><TouchableOpacity style={styles.sheetDismiss} activeOpacity={1} onPress={() => setShowAttachmentOptions(false)} /><View style={styles.attachmentSheet}><Text style={styles.sheetTitle}>첨부하기</Text><TouchableOpacity style={styles.attachmentOption} onPress={() => void selectImage()}><Text style={styles.attachmentIcon}>▧</Text><Text style={styles.rowTitle}>사진 또는 이미지</Text></TouchableOpacity><TouchableOpacity style={styles.attachmentOption} onPress={() => void attachFile()}><Text style={styles.attachmentIcon}>↧</Text><Text style={styles.rowTitle}>파일</Text></TouchableOpacity></View></View></Modal>
    <Modal visible={!!imageDraft} transparent animationType="fade" onRequestClose={() => setImageDraft(undefined)}><View style={styles.imagePreviewBackdrop}><View style={styles.imagePreviewHeader}><TouchableOpacity onPress={() => setImageDraft(undefined)}><Text style={styles.previewButton}>취소</Text></TouchableOpacity><Text style={styles.previewTitle}>사진 미리보기</Text><TouchableOpacity onPress={() => void sendImage()} disabled={uploading || sending}><Text style={[styles.previewButton, (uploading || sending) && styles.disabledText]}>{uploading ? "전송 중…" : "전송"}</Text></TouchableOpacity></View>{imageDraft ? <ZoomableImage uri={imageDraft.uri} accessibilityLabel="전송할 사진 미리보기" /> : null}</View></Modal>
    <Modal visible={!!fileDraft} transparent animationType="fade" onRequestClose={() => setFileDraft(undefined)}><View style={styles.sheetBackdrop}><TouchableOpacity style={styles.sheetDismiss} activeOpacity={1} onPress={() => setFileDraft(undefined)} /><View style={styles.filePreviewSheet}><Text style={styles.sheetTitle}>파일 전송</Text><View style={styles.filePreviewRow}><Text style={styles.fileIcon}>↧</Text><View style={{ flex: 1 }}><Text numberOfLines={2} style={styles.rowTitle}>{fileDraft?.name}</Text><Text style={styles.muted}>{fileDraft?.size ? formatFileSize(fileDraft.size) : "크기 확인 불가"}</Text></View></View><View style={styles.filePreviewActions}><Button label="취소" kind="secondary" onPress={() => setFileDraft(undefined)} disabled={uploading || sending} /><Button label={uploading ? "전송 중…" : "전송"} onPress={() => void sendFile()} disabled={uploading || sending} /></View></View></View></Modal>
    <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(undefined)}><View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.94)", padding: 16 }}><View style={styles.imagePreviewHeader}><TouchableOpacity accessibilityRole="button" onPress={() => setPreviewImage(undefined)}><Text style={styles.imagePreviewCloseText}>닫기 ✕</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" onPress={() => { if (previewImage) openFile(previewImage.url, previewImage.name); }}><Text style={styles.imagePreviewCloseText}>저장/공유 ↓</Text></TouchableOpacity></View>{previewImage ? <ZoomableImage uri={absoluteApiUrl(previewImage.url)} accessibilityLabel="채팅 이미지 미리보기" /> : null}</View></Modal>
    <Modal visible={!!otherProfile} transparent animationType="slide" onRequestClose={() => setOtherProfile(undefined)}><View style={styles.profileBackdrop}><TouchableOpacity style={styles.profileDismiss} activeOpacity={1} onPress={() => setOtherProfile(undefined)} /><View style={styles.profileSheet}><View style={styles.profileHeader}>{otherProfile?.member.picture ? <Image source={{ uri: absoluteApiUrl(otherProfile.member.picture) }} style={styles.profileAvatar} /> : <View style={styles.profileAvatarPlaceholder}><Text style={styles.link}>{otherProfile?.member.name.slice(0, 1) ?? "?"}</Text></View>}<View style={{ flex: 1 }}><Text style={styles.profileName}>{otherProfile?.member.name}{otherProfile?.nick ? ` (${otherProfile.nick})` : ""}</Text><Text style={styles.muted}>{otherProfile?.permission === "ADMIN" ? "관리자" : otherProfile?.permission === "MIDDLE_ADMIN" ? "중간관리자" : otherProfile?.permission === "TEACHER" ? "선생님" : "학생"}</Text></View><TouchableOpacity onPress={() => setOtherProfile(undefined)}><Text style={styles.link}>닫기</Text></TouchableOpacity></View>{[["상태 메시지", otherProfile?.status], ["학년·반·번호", [otherProfile?.grade, otherProfile?.class, otherProfile?.number].filter(Boolean).join(" · ")], ["직위", otherProfile?.spot], ["소속", otherProfile?.belong], ["휴대전화", otherProfile?.phone], ["유선전화", otherProfile?.wire], ["근무 위치", otherProfile?.location]].filter((row) => row[1]).map(([label, value]) => <View key={String(label)} style={styles.profileField}><Text style={styles.muted}>{label}</Text><Text style={styles.rowTitle}>{value}</Text></View>)}<Button label={openingOtherChat ? "여는 중…" : "개인 채팅 시작"} kind="secondary" onPress={() => void startChatWithOtherProfile()} disabled={openingOtherChat} /></View></View></Modal>
    <Modal visible={!!selectedMessage} transparent animationType="fade" onRequestClose={() => setSelectedMessage(undefined)}><View style={styles.contextBackdrop}><TouchableOpacity style={styles.contextDismiss} activeOpacity={1} onPress={() => setSelectedMessage(undefined)} /><View style={styles.contextDialog}><TouchableOpacity accessibilityRole="button" disabled={!selectedMessage || !visibleMessage(selectedMessage)} onPress={() => { if (!selectedMessage) return; void Clipboard.setStringAsync(visibleMessage(selectedMessage)).then(() => setSelectedMessage(undefined)).catch((error) => Alert.alert("메시지를 복사하지 못했습니다", error instanceof Error ? error.message : "다시 시도해 주세요")); }}><Text style={!selectedMessage || !visibleMessage(selectedMessage) ? styles.disabledAction : styles.copyAction}>메세지 복사하기</Text></TouchableOpacity><View style={styles.contextEmojis}>{CHAT_EMOJIS.map((emoji) => <TouchableOpacity key={emoji} accessibilityRole="button" onPress={() => { if (!selectedMessage) return; void react(selectedMessage, emoji).finally(() => setSelectedMessage(undefined)); }}><Text style={styles.contextEmoji}>{emoji}</Text></TouchableOpacity>)}</View></View></View></Modal>
  </View>;
}

function visibleMessage(message: ChatMessage) { if (message.type !== "BOT") return message.message; try { const value = JSON.parse(message.message) as { data?: unknown }; return typeof value.data === "string" ? value.data : message.message; } catch { return message.message; } }
function localDateKey(value: string) { const date = new Date(value); return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`; }
function formatLocalDate(value: string) { return new Date(value).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" }); }
function formatLocalTime(value: string) { return new Date(value).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit", hour12: true }); }
function formatFileSize(size: number) { if (size < 1024) return `${size} B`; if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`; return `${(size / (1024 * 1024)).toFixed(1)} MB`; }
function fileNameFromUrl(url: string) { const segment = url.split(/[?#]/, 1)[0]?.split("/").pop() || "첨부 파일"; try { return decodeURIComponent(segment); } catch { return segment; } }
function mimeTypeForName(name: string) { const extension = name.split(".").pop()?.toLowerCase(); return ({ pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", heic: "image/heic", txt: "text/plain", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", zip: "application/zip" } as Record<string, string>)[extension ?? ""] ?? "application/octet-stream"; }

const styles = StyleSheet.create({
  chatPage: { flex: 1 },
  chatHeader: { backgroundColor: SeugiColor.White, padding: 16, flexDirection: "row", gap: 16, alignItems: "center" },
  chatTitle: { flex: 1 },
  searchField: { flex: 1, minWidth: 0, minHeight: 40, height: 40, borderWidth: 0, borderRadius: 8 },
  searchInput: { paddingVertical: 8, color: SeugiColor.Gray800 },
  emptySearch: { textAlign: "center", color: SeugiColor.Gray500, padding: 28 },
  content: { flex: 1, padding: 16 },
  link: { color: SeugiColor.Primary500 },
  rowTitle: { fontWeight: "600" },
  message: { borderRadius: 12, padding: 12, marginBottom: 8, maxWidth: "85%" },
  ownMessage: { backgroundColor: SeugiColor.Primary100, alignSelf: "flex-end" },
  otherMessage: { backgroundColor: SeugiColor.White, alignSelf: "flex-start" },
  messageMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 6 },
  dateDivider: { alignSelf: "center", color: SeugiColor.Gray500, fontSize: 12, backgroundColor: SeugiColor.Gray100, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginVertical: 12 },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
  row: { backgroundColor: SeugiColor.White, padding: 16, marginBottom: 8, borderRadius: 12, flexDirection: "row", justifyContent: "space-between" },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  reactions: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingTop: 6 },
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
  imagePreviewClose: { alignSelf: "flex-end", minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  imagePreviewCloseText: { color: SeugiColor.White, fontSize: 16 },
  failedMessage: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: SeugiColor.White, borderWidth: 1, borderColor: SeugiColor.Red500, borderRadius: 12, padding: 12, marginTop: 8 },
  failedMessageText: { flex: 1, gap: 4 },
  filePreviewSheet: { backgroundColor: SeugiColor.White, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, paddingBottom: 32, gap: 16 },
  filePreviewRow: { flexDirection: "row", alignItems: "center", backgroundColor: SeugiColor.Gray100, borderRadius: 12, padding: 14, gap: 12 },
  filePreviewActions: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  profileBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.32)" },
  profileDismiss: { flex: 1 },
  profileSheet: { backgroundColor: SeugiColor.White, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, gap: 10 },
  profileHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 12 },
  profileAvatar: { width: 54, height: 54, borderRadius: 27 },
  profileAvatarPlaceholder: { width: 54, height: 54, borderRadius: 27, backgroundColor: SeugiColor.Primary100, alignItems: "center", justifyContent: "center" },
  profileName: { color: SeugiColor.Gray800, fontWeight: "700", fontSize: 18 },
  profileField: { borderTopWidth: 1, borderColor: SeugiColor.Gray100, paddingTop: 10, gap: 4 },
  contextBackdrop: { flex: 1, justifyContent: "center", padding: 28, backgroundColor: "rgba(0,0,0,0.32)" },
  contextDismiss: { ...StyleSheet.absoluteFillObject },
  contextDialog: { backgroundColor: SeugiColor.White, borderRadius: 16, padding: 16, gap: 8 },
  copyAction: { paddingVertical: 8, color: SeugiColor.Gray800, fontWeight: "600" },
  disabledAction: { paddingVertical: 8, color: SeugiColor.Gray400, fontWeight: "600" },
  contextEmojis: { flexDirection: "row", justifyContent: "space-between" },
  contextEmoji: { height: 32, textAlignVertical: "center", fontSize: 19 },
});
