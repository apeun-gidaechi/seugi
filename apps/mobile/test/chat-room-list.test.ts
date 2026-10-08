import assert from "node:assert/strict";
import test from "node:test";
import { formatChatRoomTimestamp, sortChatRooms } from "../src/utils/chatRoomList.ts";

test("chat rooms sort by last message timestamp descending", () => {
  const sorted = sortChatRooms([
    {
      id: "a",
      workspaceId: "w",
      type: "PERSONAL",
      name: "a",
      memberIds: [],
      adminId: "m",
      lastMessageTimestamp: "2026-10-08T10:00:00.000Z",
    },
    {
      id: "b",
      workspaceId: "w",
      type: "PERSONAL",
      name: "b",
      memberIds: [],
      adminId: "m",
      lastMessageTimestamp: "2026-10-08T12:00:00.000Z",
    },
  ]);
  assert.deepEqual(
    sorted.map((room) => room.id),
    ["b", "a"],
  );
});

test("iOS chat timestamps use today-time labels for same-day messages", () => {
  const noon = new Date(2026, 9, 8, 14, 5);
  const label = formatChatRoomTimestamp(noon.toISOString(), "ios");
  assert.match(label, /^오후 02:05$/);
});

test("Android chat timestamps use 12-hour meridiem labels", () => {
  const morning = new Date(2026, 9, 8, 9, 30);
  const label = formatChatRoomTimestamp(morning.toISOString(), "android");
  assert.equal(label, "오전 09:30");
});
