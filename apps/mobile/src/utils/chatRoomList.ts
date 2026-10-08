import type { Room } from "@seugi/contracts";

export function sortChatRooms(items?: Room[]) {
  return [...(items ?? [])].sort((left, right) =>
    (right.lastMessageTimestamp ?? "").localeCompare(left.lastMessageTimestamp ?? ""),
  );
}

export function formatChatRoomTimestamp(value: string | null | undefined, platform: "ios" | "android") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (platform === "ios") {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startYesterday = new Date(startToday);
    startYesterday.setDate(startYesterday.getDate() - 1);
    const startLastYear = new Date(now.getFullYear() - 1, 0, 1);
    if (date >= startToday) {
      return `${date.getHours() < 12 ? "오전" : "오후"} ${String(date.getHours() % 12 || 12).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    }
    if (date >= startYesterday || date >= startLastYear) {
      return `${date.getMonth() + 1}월 ${date.getDate()}일`;
    }
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  }
  const hour = date.getHours();
  const displayHour = hour >= 12 && hour !== 12 ? hour - 12 : hour;
  return `${hour < 12 ? "오전" : "오후"} ${String(displayHour).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
