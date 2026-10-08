import assert from "node:assert/strict";
import test from "node:test";
import {
  canInviteRoomMembers,
  canSendChatText,
  chatDownloadedFileUri,
  chatReactionMutation,
  hasChatPayload,
  isChatListAtBottom,
  matchesChatMessageSearch,
  matchesChatRoomSearch,
  prepareChatText,
} from "../src/utils/chat.ts";

test("native chat-room member invitations are available only in group rooms", () => {
  assert.equal(canInviteRoomMembers("GROUP", "android"), true);
  assert.equal(canInviteRoomMembers("GROUP", "ios"), false);
  assert.equal(canInviteRoomMembers("PERSONAL", "android"), false);
});

test("chat previews resolve the same sanitized local path used by downloads", () => {
  assert.equal(
    chatDownloadedFileUri("file:///documents/", "/uploads/a%20b.png?sig=1"),
    "file:///documents/a%20b.png",
  );
  assert.equal(
    chatDownloadedFileUri("file:///documents/", "/uploads/image.png", "folder/image?.png"),
    "file:///documents/folder_image_.png",
  );
});

test("chat text is sent verbatim, including leading/trailing whitespace", () => {
  const text = "  원문 보존  ";
  assert.deepEqual(prepareChatText(text, "android"), { content: text, mention: [] });
  assert.equal(canSendChatText("  "), true);
});

test("chat payload guard permits non-empty whitespace and attachments only", () => {
  assert.equal(hasChatPayload(" ", []), true);
  assert.equal(hasChatPayload("", ["upload-url"]), true);
  assert.equal(hasChatPayload("", []), false);
});

test("chat only follows new messages when the reader is already near the latest message", () => {
  assert.equal(isChatListAtBottom(1200, 1100, 100), true);
  assert.equal(isChatListAtBottom(1200, 900, 100), false);
  assert.equal(isChatListAtBottom(1200, 900, 100, 200), true);
});

test("native bot mention matching remains platform-specific", () => {
  assert.deepEqual(prepareChatText("스기야 오늘 급식", "android").mention, [-1]);
  assert.deepEqual(prepareChatText("오늘 스기야 급식 알려줘", "android").mention, []);
  assert.deepEqual(prepareChatText("오늘 스기야 급식 알려줘", "ios").mention, [-1]);
});

test("Android chat search is case-sensitive and matches message substrings", () => {
  assert.equal(matchesChatMessageSearch("android", "점심 메뉴 알려줘", "메뉴"), true);
  assert.equal(matchesChatMessageSearch("android", "Lunch Menu", "menu"), false);
  assert.equal(matchesChatMessageSearch("android", "message", " "), false);
});

test("iOS chat search uses Korean initial and partial-prefix matching", () => {
  assert.equal(matchesChatMessageSearch("ios", "고래방에서 봐", "ㄱㄹ"), true);
  assert.equal(matchesChatMessageSearch("ios", "고래방에서 봐", "고래"), true);
  assert.equal(matchesChatMessageSearch("ios", "오늘 점심 메뉴", "점심"), false);
  assert.equal(matchesChatMessageSearch("ios", "한글 메시지", " "), false);
});

test("chat-room search matches the native platform-specific chatName rules", () => {
  assert.equal(matchesChatRoomSearch("android", "홍길동", "길동"), true);
  assert.equal(matchesChatRoomSearch("android", "홍길동", "ㅎㄱ"), false);
  assert.equal(matchesChatRoomSearch("ios", "홍길동", "ㅎㄱㄷ"), true);
  assert.equal(matchesChatRoomSearch("ios", "홍길동", "길동"), false);
  assert.equal(matchesChatRoomSearch("ios", "", "ㅎㄱ"), false);
});

test("inline reaction taps toggle, while the native long-press picker only adds", () => {
  assert.equal(chatReactionMutation([], "member-a", "toggle"), "add");
  assert.equal(chatReactionMutation(["member-a"], "member-a", "toggle"), "remove");
  assert.equal(chatReactionMutation(["member-a"], "member-a", "add"), undefined);
  assert.equal(chatReactionMutation(["member-b"], "member-a", "add"), "add");
});
