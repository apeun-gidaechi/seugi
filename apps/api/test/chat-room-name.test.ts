import assert from "node:assert/strict";
import test from "node:test";
import { chatRoomName } from "../src/chatRoomName.ts";

const members = [
  { id: "a", name: "김하나" },
  { id: "b", name: "이둘" },
];

test("personal chatName is the other participant's name", () => {
  assert.equal(chatRoomName("PERSONAL", "", members, "a"), "이둘");
  assert.equal(chatRoomName("PERSONAL", "", members, "b"), "김하나");
});

test("group chatName preserves the user-chosen room name", () => {
  assert.equal(chatRoomName("GROUP", "과학동아리", members, "a"), "과학동아리");
});
