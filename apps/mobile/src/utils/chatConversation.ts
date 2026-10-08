import type { ChatMessage, Room } from "@seugi/contracts";
import { catseugiVisibleText } from "./catseugi.ts";
import type { ChatPlatform } from "./chat.ts";
import { matchesChatMessageSearch } from "./chat.ts";

export function messageLocalDateKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function formatChatLocalDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

export function formatChatLocalTime(value: string) {
  return new Date(value).toLocaleTimeString("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function chatVisibleMessage(message: ChatMessage, room: Room) {
  const participants =
    room.joinUserInfo?.map(({ userInfo }) => ({ id: userInfo.id, name: userInfo.name })) ?? [];
  return message.type === "BOT"
    ? catseugiVisibleText(message.message, participants)
    : message.message;
}

export function fileNameFromChatUrl(url: string) {
  const segment = url.split(/[?#]/, 1)[0]?.split("/").pop() || "첨부 파일";
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function mimeTypeForFileName(name: string) {
  const extension = name.split(".").pop()?.toLowerCase();
  return (
    (
      {
        pdf: "application/pdf",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp",
        heic: "image/heic",
        txt: "text/plain",
        doc: "application/msword",
        docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        xls: "application/vnd.ms-excel",
        xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ppt: "application/vnd.ms-powerpoint",
        pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        zip: "application/zip",
      } as Record<string, string>
    )[extension ?? ""] ?? "application/octet-stream"
  );
}

export function mergeOlderChatMessages(current: ChatMessage[], older: ChatMessage[]) {
  const currentIds = new Set(current.map((item) => item.id));
  return [...older.filter((item) => !currentIds.has(item.id)), ...current];
}

export function filterChatMessagesForSearch(
  messages: ChatMessage[],
  platform: ChatPlatform,
  searchText: string,
) {
  return messages
    .filter((item) => searchText.length === 0 || item.messageStatus !== "DELETE")
    .filter((item) => matchesChatMessageSearch(platform, item.message, searchText));
}

export function ownMessageUnreadCount(room: Room, memberId: string, messageCreatedAt: string) {
  return room.memberIds.filter((id) => {
    if (id === memberId) return false;
    const readAt =
      room.memberReadAt?.[id] ??
      room.joinUserInfo?.find(({ userInfo }) => userInfo.id === id)?.timestamp;
    return !readAt || readAt < messageCreatedAt;
  }).length;
}

export function shouldShowChatDateDivider(previous: ChatMessage | undefined, current: ChatMessage) {
  return (
    !previous || messageLocalDateKey(previous.createdAt) !== messageLocalDateKey(current.createdAt)
  );
}

export function shouldShowChatSender(
  previous: ChatMessage | undefined,
  current: ChatMessage,
  ownMessage: boolean,
  showDate: boolean,
) {
  return !ownMessage && (showDate || previous?.senderId !== current.senderId);
}
