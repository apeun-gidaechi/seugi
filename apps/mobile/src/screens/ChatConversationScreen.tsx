import { useEffect, useRef, useState } from "react";
import { ActionSheetIOS, Alert, BackHandler, FlatList, Image, Linking, Modal, Platform, StyleSheet, Text, TouchableOpacity, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import Svg, { Path } from "react-native-svg";
import { pickImageFromLibrary, type PickedImage } from "@seugi/media-picker";
import { SeugiColor } from "@seugi/design-tokens";
import { CHAT_EMOJIS, type ChatMemberReadEvent, type ChatMessage, type ChatMessageDeletedEvent, type ChatMessageEmojiEvent, type Room } from "@seugi/contracts";
import { Button } from "../components/ui";
import { SeugiTextField } from "../design-system/TextField";
import { SeugiAvatar } from "../design-system/Avatar";
import { ChatRoomManagement } from "../components/ChatRoomManagement";
import { ImagePreviewScreen } from "./ImagePreviewScreen";
import { ChatImageUploadPreviewScreen } from "./ChatImageUploadPreviewScreen";
import { api } from "../services/api";
import { API_URL } from "../config";
import { createAuthenticatedSocket } from "../realtime";
import { absoluteApiUrl } from "../utils/url";
import { canSendChatText, chatDownloadedFileUri, chatReactionMutation, hasChatPayload, isChatListAtBottom, prepareChatText } from "../utils/chat";
import {
  chatVisibleMessage,
  filterChatMessagesForSearch,
  formatChatLocalDate,
  formatChatLocalTime,
  fileNameFromChatUrl,
  mergeOlderChatMessages,
  mimeTypeForFileName,
  ownMessageUnreadCount,
  shouldShowChatDateDivider,
  shouldShowChatSender,
} from "../utils/chatConversation";
import { chatAttachmentMenuItems, type ChatAttachmentAction } from "../utils/chatAttachmentMenu";
import { SeugiChatTextField } from "../design-system/TextField";
import { SeugiChatAttachmentIcon } from "../design-system/ChatAttachmentIcon";

export function ChatConversationScreen({ room, onBack, onOpenRoom, onPreviewImage }: { room: Room; onBack: () => void; onOpenRoom: (room: Room) => void; onPreviewImage: (image: { url: string; name: string; onSend?: () => void; onClose?: () => void }) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]); const [memberId, setMemberId] = useState(""); const [currentRoom, setCurrentRoom] = useState(room); const [manageMembers, setManageMembers] = useState(false); const [draft, setDraft] = useState(""); const [sending, setSending] = useState(false); const [uploading, setUploading] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false); const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string }>();
  const [previewFileIsExist, setPreviewFileIsExist] = useState<boolean>();
  const [imageDraft, setImageDraft] = useState<PickedImage>();
  const [uploadedImage, setUploadedImage] = useState<{ url: string; name: string }>();
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const messageListRef = useRef<FlatList<ChatMessage>>(null);
  const shouldStickToBottom = useRef(true);
  const pendingTailScroll = useRef(true);
  const animateTailScroll = useRef(false);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage>();
  const [failedOutgoing, setFailedOutgoing] = useState<Array<{ id: string; message: string; files: string[]; type: "MESSAGE" | "IMG" | "FILE"; mention: number[]; file?: DocumentPicker.DocumentPickerAsset }>>([]);
  useEffect(() => {
    let active = true;
    if (!previewImage || Platform.OS !== "android") {
      setPreviewFileIsExist(undefined);
      return () => { active = false; };
    }
    setPreviewFileIsExist(undefined);
    const directory = FileSystem.documentDirectory;
    if (!directory) {
      setPreviewFileIsExist(false);
      return () => { active = false; };
    }
    void FileSystem.getInfoAsync(chatDownloadedFileUri(directory, previewImage.url, previewImage.name))
      .then((info) => { if (active) setPreviewFileIsExist(info.exists); })
      .catch(() => { if (active) setPreviewFileIsExist(false); });
    return () => { active = false; };
  }, [previewImage]);
  useEffect(() => {
    if (!manageMembers) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      setManageMembers(false);
      return true;
    });
    return () => subscription.remove();
  }, [manageMembers]);
  useEffect(() => { let active = true; const socket = createAuthenticatedSocket(api, API_URL, () => Alert.alert("세션 오류", "세션을 갱신할 수 없습니다. 다시 로그인해주세요.")); api.messages(room.id).then((result) => { if (!active) return; setMessages((result.data?.messages ?? []).reverse()); setHasOlderMessages(result.data?.hasNext ?? false); pendingTailScroll.current = true; animateTailScroll.current = false; setMessagesLoaded(true); }).catch(() => { if (active) setMessagesLoaded(true); }); api.memberInfo().then((result) => active && setMemberId(result.data?.id ?? "")).catch(() => undefined); socket.on("connect", () => socket.emit("room:join", room.id)); socket.on("chat:message", (message: ChatMessage) => { if (message.roomId !== room.id) return; setMessages((current) => { if (current.some((item) => item.id === message.id)) return current; if (shouldStickToBottom.current) { pendingTailScroll.current = true; animateTailScroll.current = true; } return [...current, message]; }); }); socket.on("chat:message-deleted", (event: ChatMessageDeletedEvent) => { if (event.roomId === room.id) setMessages((current) => current.map((item) => item.id === event.messageId ? { ...item, message: "", files: undefined, messageStatus: "DELETE" } : item)); }); socket.on("chat:message-emoji", (event: ChatMessageEmojiEvent) => { if (event.roomId !== room.id) return; setMessages((current) => current.map((item) => { if (item.id !== event.messageId) return item; const users = item.emojis[event.emoji] ?? []; const nextUsers = event.action === "ADD" ? [...new Set([...users, event.senderId])] : users.filter((id) => id !== event.senderId); return { ...item, emojis: { ...item.emojis, [event.emoji]: nextUsers } }; })); }); socket.on("chat:member-read", (event: ChatMemberReadEvent) => { if (event.roomId !== room.id) return; setCurrentRoom((current) => ({ ...current, memberReadAt: { ...current.memberReadAt, [event.userId]: event.readAt }, joinUserInfo: current.joinUserInfo?.map((member) => member.userInfo.id === event.userId ? { ...member, timestamp: event.readAt } : member) })); }); return () => { active = false; socket.close(); }; }, [room.id]);
  const loadOlderMessages = async () => {
    const cursor = messages[0]?.createdAt;
    if (!cursor || !hasOlderMessages || loadingOlderMessages) return;
    setLoadingOlderMessages(true);
    try {
      const result = await api.messages(room.id, cursor);
      const older = (result.data?.messages ?? []).reverse();
      setMessages((current) => mergeOlderChatMessages(current, older));
      setHasOlderMessages(result.data?.hasNext ?? false);
    } catch (error) {
      Alert.alert("이전 대화를 불러오지 못했습니다", error instanceof Error ? error.message : "네트워크 연결을 확인해 주세요");
    } finally { setLoadingOlderMessages(false); }
  };
  const deliver = (message: string, files: string[] = [], type: "MESSAGE" | "IMG" | "FILE" = "MESSAGE", retryId?: string, mention: number[] = []) => {
    if (!hasChatPayload(message, files) || sending) return;
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
        if (type === "IMG") { setImageDraft(undefined); setUploadedImage(undefined); }
      } else {
        setFailedOutgoing((items) => retryId
          ? items.map((item) => item.id === retryId ? { ...item, message, files, type } : item)
          : [...items, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, message, files, type, mention }]);
        Alert.alert("전송 실패", result.message);
      }
    };
    socket = createAuthenticatedSocket(api, API_URL, () => finish({ message: "세션을 갱신할 수 없습니다" }));
    socket.once("connect_error", (error) => { if (error.message !== "UNAUTHORIZED") finish({ message: "채팅 서버에 연결하지 못했습니다" }); });
    socket.once("connect", () => { socket.emit("room:join", room.id); socket.emit("chat:message", { roomId: room.id, message, files, type, mention }, finish); });
  };
  const send = () => {
    const payload = prepareChatText(draft, Platform.OS);
    deliver(payload.content, [], "MESSAGE", undefined, payload.mention);
  };
  const openAttachmentMenu = () => {
    if (Platform.OS === "ios") {
      const items = chatAttachmentMenuItems("ios");
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...items.map((item) => item.label), "취소"], cancelButtonIndex: items.length },
        (index) => {
          const item = items[index];
          if (item) selectAttachment(item.action);
        },
      );
      return;
    }
    setShowAttachmentOptions(true);
  };
  const selectAttachment = (action: ChatAttachmentAction) => {
    if (action === "image") void selectImage();
    else void attachFile();
  };
  const attachFile = async () => { setShowAttachmentOptions(false); if (uploading || sending) return; try { const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false }); if (!result.canceled && result.assets[0]) await sendFile(result.assets[0]); } catch (error) { Alert.alert("파일을 불러오지 못했습니다", error instanceof Error ? error.message : "다시 시도해 주세요"); } };
  const sendFile = async (file: DocumentPicker.DocumentPickerAsset, retryId?: string) => { if (uploading || sending) return; setUploading(true); try { const form = new FormData(); form.append("file", { uri: file.uri, name: file.name, type: file.mimeType ?? "application/octet-stream" } as unknown as Blob); const uploaded = await api.uploadFile("FILE", form); if (!uploaded.data?.url) throw new Error("파일 업로드 응답이 올바르지 않습니다"); if (retryId) setFailedOutgoing((items) => items.map((item) => item.id === retryId ? { ...item, file: undefined } : item)); deliver(`${uploaded.data.url}::${file.name}::${file.size ?? uploaded.data.size}`, [], "FILE", retryId); } catch (error) { if (retryId) setFailedOutgoing((items) => items.map((item) => item.id === retryId ? { ...item, file } : item)); else setFailedOutgoing((items) => [...items, { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, message: file.name, files: [], type: "FILE", mention: [], file }]); Alert.alert("파일 전송 실패", error instanceof Error ? error.message : "다시 시도해 주세요"); } finally { setUploading(false); } };
  const retryOutgoing = (item: (typeof failedOutgoing)[number]) => item.file ? void sendFile(item.file, item.id) : deliver(item.message, item.files, item.type, item.id, item.mention);
  const selectImage = async () => {
    setShowAttachmentOptions(false);
    if (uploading || sending) return;
    try {
      const asset = await pickImageFromLibrary();
      if (!asset) return;
      if (Platform.OS === "ios") {
        setUploading(true);
        try {
          const form = new FormData();
          form.append("file", { uri: asset.uri, name: asset.name, type: asset.mimeType ?? "image/jpeg" } as unknown as Blob);
          const uploaded = await api.uploadFile("IMG", form);
          if (!uploaded.data?.url) throw new Error("이미지 업로드 응답이 올바르지 않습니다");
          const image = { url: uploaded.data.url, name: asset.name };
          setUploadedImage(image);
          setImageDraft(asset);
          onPreviewImage({
            ...image,
            onSend: () => deliver(`${image.url}::${image.name}`, [], "IMG"),
            onClose: () => { setImageDraft(undefined); setUploadedImage(undefined); },
          });
        } finally {
          setUploading(false);
        }
      } else {
        setImageDraft(asset);
      }
    } catch (error) {
      Alert.alert("사진 업로드 실패", error instanceof Error ? error.message : "다시 시도해 주세요");
    }
  };
  const sendImage = async () => {
    if (!imageDraft || uploading || sending) return;
    if (uploadedImage) {
      deliver(`${uploadedImage.url}::${uploadedImage.name}`, [], "IMG");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", { uri: imageDraft.uri, name: imageDraft.name, type: imageDraft.mimeType ?? "image/jpeg" } as unknown as Blob);
      const uploaded = await api.uploadFile("IMG", form);
      if (!uploaded.data?.url) throw new Error("이미지 업로드 응답이 올바르지 않습니다");
      deliver(`${uploaded.data.url}::${imageDraft.name}`, [], "IMG");
    } catch (error) {
      Alert.alert("사진 전송 실패", error instanceof Error ? error.message : "다시 시도해 주세요");
    } finally {
      setUploading(false);
    }
  };
  const downloadFile = async (url: string, name?: string) => {
    if (Platform.OS === "web") {
      await Linking.openURL(absoluteApiUrl(url));
      return;
    }
    const directory = FileSystem.documentDirectory;
    if (!directory) throw new Error("파일 저장 위치를 확인할 수 없습니다");
    const destination = chatDownloadedFileUri(directory, url, name);
    const safeName = decodeURIComponent(destination.slice(directory.length));
    const existing = await FileSystem.getInfoAsync(destination);
    if (!existing.exists) {
      const result = await FileSystem.downloadAsync(absoluteApiUrl(url), destination);
      if (result.status < 200 || result.status >= 300) throw new Error(`다운로드에 실패했습니다 (${result.status})`);
    }
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(destination, { dialogTitle: safeName, mimeType: mimeTypeForFileName(safeName) });
    else Alert.alert("파일 저장 완료", `앱 문서에 저장했습니다: ${safeName}`);
  };
  const openFile = (url: string, name?: string) => {
    void downloadFile(url, name).catch((error) => Alert.alert("파일을 저장하지 못했습니다", error instanceof Error ? error.message : "네트워크 연결을 확인해 주세요"));
  };
  const downloadPreviewImage = async () => {
    if (!previewImage) return;
    try {
      await downloadFile(previewImage.url, previewImage.name);
      const directory = FileSystem.documentDirectory;
      if (!directory) return;
      const info = await FileSystem.getInfoAsync(chatDownloadedFileUri(directory, previewImage.url, previewImage.name));
      setPreviewFileIsExist(info.exists);
    } catch (error) {
      Alert.alert("파일을 저장하지 못했습니다", error instanceof Error ? error.message : "네트워크 연결을 확인해 주세요");
    }
  };
  const mutateReaction = async (message: ChatMessage, emoji: string, intent: "toggle" | "add") => {
    const current = message.emojis[emoji] ?? [];
    const mutation = chatReactionMutation(current, memberId, intent);
    if (!mutation) return;
    try {
      if (mutation === "remove") await api.removeMessageEmoji(message.id, emoji);
      else await api.addMessageEmoji(message.id, emoji);
      setMessages((items) => items.map((item) => item.id !== message.id ? item : {
        ...item,
        emojis: { ...item.emojis, [emoji]: mutation === "remove" ? current.filter((id) => id !== memberId) : [...current, memberId] },
      }));
    } catch (error) {
      Alert.alert("반응을 저장하지 못했습니다", error instanceof Error ? error.message : "다시 시도해 주세요");
    }
  };
  const react = (message: ChatMessage, emoji: string) => void mutateReaction(message, emoji, "toggle");
  const finishSearch = () => { setSearchMode(false); setSearchText(""); };
  const back = () => { if (searchMode) setSearchMode(false); else onBack(); };
  const openImagePreview = (image: { url: string; name: string }) => {
    if (Platform.OS === "ios") onPreviewImage(image);
    else setPreviewImage(image);
  };
  const handleMessageListScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    shouldStickToBottom.current = isChatListAtBottom(contentSize.height, contentOffset.y, layoutMeasurement.height);
  };
  const handleMessageListContentSizeChange = () => {
    if (!messagesLoaded || !pendingTailScroll.current) return;
    const animated = animateTailScroll.current;
    pendingTailScroll.current = false;
    animateTailScroll.current = false;
    requestAnimationFrame(() => messageListRef.current?.scrollToEnd({ animated }));
  };
  const visibleMessages = filterChatMessagesForSearch(messages, Platform.OS === "ios" ? "ios" : "android", searchText);
  return <View style={styles.chatPage}>
    <View style={styles.chatHeader}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={searchMode ? "검색 닫기" : "채팅 목록으로 돌아가기"} onPress={back} style={[styles.backButton, Platform.OS === "ios" && styles.iosBackButton]}>
        <Svg width={Platform.OS === "ios" ? 24 : 28} height={Platform.OS === "ios" ? 24 : 28} viewBox={Platform.OS === "ios" ? "0 0 24 24" : "0 0 28 28"}>
          {Platform.OS === "ios"
            ? <Path d="M16.6036 19.7071c-.3906.3905-1.0237.3905-1.4143 0l-6.8232-6.8232a1.25 1.25 0 0 1 0-1.7678l6.8232-6.8232c.3906-.3905 1.0237-.3905 1.4143 0 .3905.3905.3905 1.0237 0 1.4142L10.3107 12l6.2929 6.2929c.3905.3905.3905 1.0237 0 1.4142Z" fill={SeugiColor.Gray600} />
            : <Path d="M13.054 22.992c.456.455 1.194.455 1.65 0 .456-.456.456-1.195 0-1.65l-6.31-6.311h13.773c.583 0 1.166-.448 1.166-1.031 0-.608-.583-1.031-1.166-1.031H8.394l6.31-6.311c.456-.455.456-1.194 0-1.65-.456-.455-1.194-.455-1.65 0l-7.96 7.961a1.46 1.46 0 0 0 0 2.062l7.96 7.961Z" fill={SeugiColor.Gray600} />}
        </Svg>
      </TouchableOpacity>
      {searchMode
        ? <SeugiTextField autoFocus clearable={false} value={searchText} onChangeText={setSearchText} placeholder={Platform.OS === "android" ? "메세지 검색" : "메세지, 이미지, 파일 검색"} fieldStyle={styles.searchField} style={styles.searchInput} returnKeyType="search" onSubmitEditing={Platform.OS === "android" ? finishSearch : undefined} />
        : <Text numberOfLines={1} style={[styles.rowTitle, styles.chatTitle]}>{currentRoom.name}</Text>}
      {!searchMode ? (
        <View style={styles.headerActions}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="메시지 검색" onPress={() => setSearchMode(true)} style={styles.headerAction}>
            <Svg width={28} height={28} viewBox="0 0 24 24"><Path d="M15.5 14h-.79l-.28-.27A6.5 6.5 0 1 0 14 14.71l.29.29v.79l5 4.99L20.49 19l-4.99-5v-.5ZM9.5 14a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z" fill={SeugiColor.Gray600} fillRule="evenodd" /></Svg>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="구성원 열기" onPress={() => setManageMembers(true)} style={styles.headerAction}>
            <Svg width={28} height={28} viewBox="0 0 24 25">
              <Path d="M4 6.364C4 5.812 4.448 5.364 5 5.364L19 5.364C19.552 5.364 20 5.812 20 6.364C20 6.916 19.552 7.364 19 7.364L5 7.364C4.448 7.364 4 6.916 4 6.364ZM4 12.364C4 11.812 4.448 11.364 5 11.364L19 11.364C19.552 11.364 20 11.812 20 12.364C20 12.916 19.552 13.364 19 13.364L5 13.364C4.448 13.364 4 12.916 4 12.364ZM4 18.364C4 17.812 4.448 17.364 5 17.364H19C19.552 17.364 20 17.812 20 18.364C20 18.916 19.552 19.364 19 19.364H5C4.448 19.364 4 18.916 4 18.364Z" fill={SeugiColor.Gray600} />
            </Svg>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
      <FlatList ref={messageListRef} style={styles.content} data={visibleMessages} keyExtractor={(item) => item.id} maintainVisibleContentPosition={{ minIndexForVisible: 0 }} onScroll={handleMessageListScroll} scrollEventThrottle={16} onContentSizeChange={handleMessageListContentSizeChange} ListEmptyComponent={searchText.length > 0 ? <Text style={styles.emptySearch}>검색 결과가 없습니다.</Text> : null} ListHeaderComponent={hasOlderMessages ? <Button label="이전 대화 불러오기" kind="secondary" onPress={() => void loadOlderMessages()} disabled={loadingOlderMessages} loading={loadingOlderMessages} /> : null}
        ListFooterComponent={failedOutgoing.length ? <View>{failedOutgoing.map((failed) => <View key={failed.id} style={styles.failedMessage}><View style={styles.failedMessageText}><Text style={styles.error}>메시지를 보내지 못했습니다.</Text><Text numberOfLines={2} style={styles.muted}>{failed.file?.name ?? (failed.type === "IMG" ? "사진 첨부" : failed.type === "FILE" ? "파일 첨부" : failed.message)}</Text></View><TouchableOpacity disabled={sending || uploading} onPress={() => retryOutgoing(failed)}><Text style={styles.link}>{sending || uploading ? "재전송 중…" : "재전송"}</Text></TouchableOpacity><TouchableOpacity disabled={sending || uploading} onPress={() => setFailedOutgoing((items) => items.filter((item) => item.id !== failed.id))}><Text style={styles.muted}>닫기</Text></TouchableOpacity></View>)}</View> : null}
        renderItem={({ item, index }) => {
          const parts = item.message.split("::");
          const imageUrl = item.type === "IMG" ? parts[0] : undefined;
          const fileUrl = item.type === "FILE" ? parts[0] : undefined;
          const fileName = item.type === "FILE" ? parts[1] : undefined;
          const ownMessage = item.senderId === memberId;
          const previous = visibleMessages[index - 1];
          const showDate = shouldShowChatDateDivider(previous, item);
          const showSender = shouldShowChatSender(previous, item, ownMessage, showDate);
          const sender = currentRoom.joinUserInfo?.find(({ userInfo }) => userInfo.id === item.senderId)?.userInfo;
          const unreadCount = ownMessage ? ownMessageUnreadCount(currentRoom, memberId, item.createdAt) : 0;
          const reactions = Object.entries(item.emojis).filter(([, users]) => users.length > 0);
          return <View>
            {showDate ? <Text style={styles.dateDivider}>{formatChatLocalDate(item.createdAt)}</Text> : null}
            <TouchableOpacity activeOpacity={1} onLongPress={() => item.messageStatus !== "DELETE" && setSelectedMessage(item)} style={[styles.message, ownMessage ? styles.ownMessage : styles.otherMessage]}>
            {showSender ? <View style={styles.senderHeader}><SeugiAvatar uri={sender?.picture ? absoluteApiUrl(sender.picture) : undefined} name={sender?.name} imageStyle={styles.senderAvatar} fallbackStyle={styles.senderAvatarFallback} labelStyle={styles.muted} /><Text style={styles.senderName}>{sender?.name ?? "구성원"}</Text></View> : null}
            {item.messageStatus === "DELETE" ? <Text style={styles.muted}>메시지가 삭제되었습니다.</Text> : <>
              {imageUrl ? <TouchableOpacity onPress={() => openImagePreview({ url: imageUrl, name: parts[1] || "채팅 이미지" })}><Image source={{ uri: absoluteApiUrl(imageUrl) }} resizeMode="cover" style={styles.imageMessage} /></TouchableOpacity> : null}
              {fileUrl ? <TouchableOpacity onPress={() => openFile(fileUrl, fileName)} style={styles.fileMessage}><Text style={styles.fileIcon}>↧</Text><View style={{ flex: 1 }}><Text numberOfLines={1} style={styles.rowTitle}>{fileName || "첨부 파일"}</Text><Text style={styles.link}>파일 저장/공유 ↗</Text></View></TouchableOpacity> : null}
              {chatVisibleMessage(item, currentRoom) && !imageUrl && !fileUrl ? <Text>{chatVisibleMessage(item, currentRoom)}</Text> : null}
              {item.files?.map((url) => <TouchableOpacity key={url} onPress={() => /\.(?:png|jpe?g|gif|webp|heic|bmp)(?:[?#]|$)/i.test(url) ? openImagePreview({ url, name: fileNameFromChatUrl(url) }) : openFile(url)}><Text style={styles.link}>{/\.(?:png|jpe?g|gif|webp|heic|bmp)(?:[?#]|$)/i.test(url) ? "이미지 미리보기" : "첨부 파일 저장/공유 ↗"}</Text></TouchableOpacity>)}
            </>}
            <View style={styles.messageMeta}>{unreadCount ? <Text style={styles.unreadCount}>안읽음 {unreadCount}</Text> : null}<Text style={styles.muted}>{formatChatLocalTime(item.createdAt)}</Text></View>
            {item.messageStatus !== "DELETE" && reactions.length ? <View style={styles.reactions}>{reactions.map(([emoji, users]) => <TouchableOpacity key={emoji} onPress={() => react(item, emoji)}><Text>{emoji} {users.length}</Text></TouchableOpacity>)}</View> : null}
            </TouchableOpacity>
          </View>;
        }}
      />
      <View style={styles.composerWrap}>
        <SeugiChatTextField value={draft} onChangeText={setDraft} placeholder="메세지 보내기" onAddClick={openAttachmentMenu} onSendClick={() => void send()} sendEnabled={!sending && canSendChatText(draft)} editable={!sending} />
      </View>
    {manageMembers ? <ChatRoomManagement
      room={currentRoom}
      memberId={memberId}
      notificationEnabled={notificationEnabled}
      onNotificationToggle={() => setNotificationEnabled((value) => !value)}
      onRoomChange={setCurrentRoom}
      onClose={() => setManageMembers(false)}
      onLeave={onBack}
      onOpenPersonalChat={(nextRoom) => { setManageMembers(false); onOpenRoom(nextRoom); }}
    /> : null}
    {Platform.OS === "android" ? <Modal visible={showAttachmentOptions} transparent animationType="fade" onRequestClose={() => setShowAttachmentOptions(false)}><TouchableOpacity activeOpacity={1} onPress={() => setShowAttachmentOptions(false)} style={styles.attachmentBackdrop}><View style={styles.attachmentMenu}>{chatAttachmentMenuItems("android").map((item) => <TouchableOpacity key={item.action} style={styles.attachmentOption} onPress={() => selectAttachment(item.action)}><SeugiChatAttachmentIcon kind={item.action} color={SeugiColor.Black} /><Text style={styles.rowTitle}>{item.label}</Text></TouchableOpacity>)}</View></TouchableOpacity></Modal> : null}
    <ChatImageUploadPreviewScreen
      visible={Platform.OS === "android" && !!imageDraft}
      imageUri={imageDraft ? uploadedImage?.url ? absoluteApiUrl(uploadedImage.url) : imageDraft.uri : undefined}
      busy={uploading || sending}
      onClose={() => { setImageDraft(undefined); setUploadedImage(undefined); }}
      onSend={() => void sendImage()}
      onRetry={() => void selectImage()}
    />
    <ImagePreviewScreen
      visible={Platform.OS === "android" && !!previewImage}
      uri={previewImage ? absoluteApiUrl(previewImage.url) : undefined}
      fileIsExist={previewFileIsExist}
      onClose={() => setPreviewImage(undefined)}
      onDownload={() => void downloadPreviewImage()}
    />
    <Modal visible={!!selectedMessage} transparent animationType="fade" onRequestClose={() => setSelectedMessage(undefined)}><View style={styles.contextBackdrop}><TouchableOpacity style={styles.contextDismiss} activeOpacity={1} onPress={() => setSelectedMessage(undefined)} /><View style={styles.contextDialog}><TouchableOpacity accessibilityRole="button" disabled={!selectedMessage || !chatVisibleMessage(selectedMessage, currentRoom)} onPress={() => { if (!selectedMessage) return; void Clipboard.setStringAsync(chatVisibleMessage(selectedMessage, currentRoom)).then(() => setSelectedMessage(undefined)).catch((error) => Alert.alert("메시지를 복사하지 못했습니다", error instanceof Error ? error.message : "다시 시도해 주세요")); }}><Text style={!selectedMessage || !chatVisibleMessage(selectedMessage, currentRoom) ? styles.disabledAction : styles.copyAction}>메세지 복사하기</Text></TouchableOpacity><View style={styles.contextEmojis}>{CHAT_EMOJIS.map((emoji) => <TouchableOpacity key={emoji} accessibilityRole="button" onPress={() => { if (!selectedMessage) return; const message = selectedMessage; setSelectedMessage(undefined); void mutateReaction(message, emoji, "add"); }}><Text style={styles.contextEmoji}>{emoji}</Text></TouchableOpacity>)}</View></View></View></Modal>
  </View>;
}

const styles = StyleSheet.create({
  chatPage: { flex: 1, backgroundColor: SeugiColor.Primary050 },
  chatHeader: { height: 54, backgroundColor: SeugiColor.White, paddingHorizontal: 16, flexDirection: "row", gap: 16, alignItems: "center", zIndex: 1, shadowColor: SeugiColor.Black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  backButton: { width: 28, height: 36, alignItems: "center", justifyContent: "center" },
  iosBackButton: { width: 24 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  headerAction: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  chatTitle: { flex: 1, fontSize: 16 },
  searchField: { flex: 1, minWidth: 0, minHeight: 40, height: 40, borderWidth: 0, borderRadius: 8 },
  searchInput: { paddingVertical: 8, color: SeugiColor.Gray800 },
  emptySearch: { textAlign: "center", color: SeugiColor.Gray500, padding: 28 },
  content: { flex: 1, paddingHorizontal: 8 },
  composerWrap: { paddingHorizontal: 8, paddingBottom: 8, backgroundColor: SeugiColor.Primary050 },
  link: { color: SeugiColor.Primary500 },
  rowTitle: { fontWeight: "600" },
  message: { borderRadius: 12, padding: 12, marginBottom: 8, maxWidth: "85%" },
  ownMessage: { backgroundColor: SeugiColor.Primary100, alignSelf: "flex-end" },
  otherMessage: { backgroundColor: SeugiColor.White, alignSelf: "flex-start" },
  messageMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 6 },
  dateDivider: { alignSelf: "center", color: SeugiColor.Gray500, fontSize: 12, backgroundColor: SeugiColor.Gray100, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginVertical: 12 },
  senderHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  senderAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: SeugiColor.Gray100 },
  senderAvatarFallback: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: SeugiColor.Gray100 },
  senderName: { color: SeugiColor.Gray700, fontSize: 12, fontWeight: "600" },
  unreadCount: { color: SeugiColor.Primary500, fontSize: 11, fontWeight: "600" },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
  row: { backgroundColor: SeugiColor.White, padding: 16, marginBottom: 8, borderRadius: 12, flexDirection: "row", justifyContent: "space-between" },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  reactions: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingTop: 6 },
  imageMessage: { width: 220, height: 220, maxWidth: "100%", borderRadius: 10, backgroundColor: SeugiColor.Gray100 },
  fileMessage: { minWidth: 210, maxWidth: 270, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: SeugiColor.Gray100, borderRadius: 10, padding: 12 },
  fileIcon: { fontSize: 24, color: SeugiColor.Primary500 },
  attachmentBackdrop: { flex: 1, justifyContent: "flex-end", alignItems: "flex-start", paddingLeft: 26, paddingBottom: 30 },
  attachmentMenu: { width: 188, backgroundColor: SeugiColor.White, borderRadius: 16, padding: 16, elevation: 8, shadowColor: SeugiColor.Black, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  attachmentOption: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 8 },
  imagePreviewBackdrop: { flex: 1, backgroundColor: "#101010", paddingTop: 52, paddingBottom: 24 },
  imagePreviewHeader: { height: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 },
  previewButton: { color: SeugiColor.White, fontSize: 16 },
  previewTitle: { color: SeugiColor.White, fontSize: 16, fontWeight: "600" },
  disabledText: { opacity: 0.5 },
  imagePreviewClose: { alignSelf: "flex-end", minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  imagePreviewCloseText: { color: SeugiColor.White, fontSize: 16 },
  failedMessage: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: SeugiColor.White, borderWidth: 1, borderColor: SeugiColor.Red500, borderRadius: 12, padding: 12, marginTop: 8 },
  failedMessageText: { flex: 1, gap: 4 },
  contextBackdrop: { flex: 1, justifyContent: "center", padding: 28, backgroundColor: "rgba(0,0,0,0.32)" },
  contextDismiss: { ...StyleSheet.absoluteFillObject },
  contextDialog: { backgroundColor: SeugiColor.White, borderRadius: 16, padding: 16, gap: 8 },
  copyAction: { paddingVertical: 8, color: SeugiColor.Gray800, fontWeight: "600" },
  disabledAction: { paddingVertical: 8, color: SeugiColor.Gray400, fontWeight: "600" },
  contextEmojis: { flexDirection: "row", justifyContent: "space-between" },
  contextEmoji: { height: 32, textAlignVertical: "center", fontSize: 19 },
});
