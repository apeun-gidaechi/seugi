import assert from "node:assert/strict";
import test from "node:test";
import type { ChatMessage, Room } from "@seugi/contracts";
import {
  chatVisibleMessage,
  filterChatMessagesForSearch,
  mergeOlderChatMessages,
  messageLocalDateKey,
  ownMessageUnreadCount,
  shouldShowChatDateDivider,
} from "../src/utils/chatConversation.ts";

const room: Room = {
  id: "room-1",
  workspaceId: "w1",
  type: "GROUP",
  name: "테스트",
  memberIds: ["me", "peer"],
  adminId: "me",
  joinUserInfo: [
    {
      userInfo: { id: "me", name: "나", email: "me@example.com", picture: "", birth: "" },
      timestamp: "2026-10-08T00:00:00.000Z",
    },
    {
      userInfo: { id: "peer", name: "상대", email: "peer@example.com", picture: "", birth: "" },
      timestamp: "2026-10-08T10:00:00.000Z",
    },
  ],
};

test("chat message date keys group by local calendar day", () => {
  const sameDayMorning = new Date(2026, 9, 8, 1, 0).toISOString();
  const sameDayEvening = new Date(2026, 9, 8, 23, 0).toISOString();
  const nextDay = new Date(2026, 9, 9, 1, 0).toISOString();
  assert.equal(messageLocalDateKey(sameDayMorning), messageLocalDateKey(sameDayEvening));
  assert.notEqual(messageLocalDateKey(sameDayMorning), messageLocalDateKey(nextDay));
});

test("older chat pages prepend without duplicate ids", () => {
  const current = [
    {
      id: "b",
      roomId: "r",
      senderId: "s",
      message: "b",
      type: "MESSAGE",
      createdAt: "2026-10-08T00:00:01.000Z",
      emojis: {},
      messageStatus: "ALIVE",
    } satisfies ChatMessage,
  ];
  const older = [
    {
      id: "a",
      roomId: "r",
      senderId: "s",
      message: "a",
      type: "MESSAGE",
      createdAt: "2026-10-08T00:00:00.000Z",
      emojis: {},
      messageStatus: "ALIVE",
    },
    {
      id: "b",
      roomId: "r",
      senderId: "s",
      message: "dup",
      type: "MESSAGE",
      createdAt: "2026-10-08T00:00:00.500Z",
      emojis: {},
      messageStatus: "ALIVE",
    },
  ] satisfies ChatMessage[];
  assert.deepEqual(
    mergeOlderChatMessages(current, older).map((item) => item.id),
    ["a", "b"],
  );
});

test("chat search filter hides deleted rows and applies platform rules", () => {
  const messages = [
    {
      id: "1",
      roomId: "r",
      senderId: "s",
      message: "점심 메뉴",
      type: "MESSAGE",
      createdAt: "2026-10-08T00:00:00.000Z",
      emojis: {},
      messageStatus: "DELETE",
    },
    {
      id: "2",
      roomId: "r",
      senderId: "s",
      message: "점심 메뉴",
      type: "MESSAGE",
      createdAt: "2026-10-08T00:00:01.000Z",
      emojis: {},
      messageStatus: "ALIVE",
    },
  ] satisfies ChatMessage[];
  assert.equal(filterChatMessagesForSearch(messages, "android", "메뉴").length, 1);
  assert.equal(filterChatMessagesForSearch(messages, "ios", "메뉴").length, 0);
});

test("unread counts ignore the sender and honor member read timestamps", () => {
  assert.equal(ownMessageUnreadCount(room, "me", "2026-10-08T12:00:00.000Z"), 1);
  assert.equal(
    ownMessageUnreadCount(
      { ...room, memberReadAt: { peer: "2026-10-08T13:00:00.000Z" } },
      "me",
      "2026-10-08T12:00:00.000Z",
    ),
    0,
  );
});

test("bot messages render structured CatSeugi answers", () => {
  const message: ChatMessage = {
    id: "bot",
    roomId: "room-1",
    senderId: "bot",
    type: "BOT",
    message: JSON.stringify({ keyword: "기타", data: "안녕" }),
    createdAt: "2026-10-08T00:00:00.000Z",
    emojis: {},
    messageStatus: "ALIVE",
  };
  assert.equal(chatVisibleMessage(message, room), "안녕");
});

test("date dividers appear when the local day changes", () => {
  const first = {
    id: "1",
    roomId: "r",
    senderId: "s",
    message: "a",
    type: "MESSAGE",
    createdAt: "2026-10-08T00:00:00.000Z",
    emojis: {},
    messageStatus: "ALIVE",
  } satisfies ChatMessage;
  const second = { ...first, id: "2", createdAt: "2026-10-09T00:00:00.000Z" };
  assert.equal(shouldShowChatDateDivider(undefined, first), true);
  assert.equal(shouldShowChatDateDivider(first, second), true);
  assert.equal(shouldShowChatDateDivider(first, { ...first, id: "3" }), false);
});
