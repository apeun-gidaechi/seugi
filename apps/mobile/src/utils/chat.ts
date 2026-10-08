import { matchesIosKoreanPrefixSearch } from "./koreanSearch.ts";

export type ChatPlatform = "android" | "ios" | "web" | "windows" | "macos";

/** Android exposes member invitation for group rooms; the native iOS drawer has no invite action. */
export function canInviteRoomMembers(roomType: "GROUP" | "PERSONAL", platform: ChatPlatform) {
  return roomType === "GROUP" && platform === "android";
}

/** Matches the app-local filename used by chat attachment downloads and previews. */
export function chatDownloadedFileUri(directory: string, url: string, name?: string) {
  const segment = url.split(/[?#]/, 1)[0]?.split("/").pop() || "첨부 파일";
  let decodedName = segment;
  try { decodedName = decodeURIComponent(segment); } catch { /* Keep the encoded path segment. */ }
  const safeName = (name || decodedName).replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim() || "첨부 파일";
  return `${directory}${encodeURIComponent(safeName)}`;
}

export function prepareChatText(text: string, platform: ChatPlatform) {
  const mentionsBot = platform === "android"
    ? text.startsWith("스기야 ")
    : platform === "ios" && text.includes("스기야");
  return { content: text, mention: mentionsBot ? [-1] : [] };
}

/** Mirrors Android's case-sensitive substring search and iOS's Korean-aware prefix search. */
export function matchesChatMessageSearch(platform: ChatPlatform, message: string, query: string) {
  if (query.length === 0) return true;
  if (platform !== "ios") return message.includes(query);
  return matchesIosKoreanPrefixSearch(message, query);
}

/** Matches native chat-list filtering, which searches the room's user-facing chatName. */
export function matchesChatRoomSearch(platform: ChatPlatform, chatName: string, query: string) {
  if (query.length === 0) return true;
  if (platform === "ios") return matchesIosKoreanPrefixSearch(chatName, query);
  return chatName.includes(query);
}

export function canSendChatText(text: string) {
  return text.length > 0;
}

export function isChatListAtBottom(
  contentHeight: number,
  offsetY: number,
  viewportHeight: number,
  threshold = 80,
) {
  return contentHeight - offsetY - viewportHeight <= threshold;
}

export function hasChatPayload(message: string, files: string[]) {
  return canSendChatText(message) || files.length > 0;
}

/** Inline reaction taps toggle; the native long-press picker only adds a missing reaction. */
export function chatReactionMutation(users: string[], memberId: string, intent: "toggle" | "add") {
  const alreadyReacted = users.includes(memberId);
  if (intent === "add") return alreadyReacted ? undefined : "add";
  return alreadyReacted ? "remove" : "add";
}
