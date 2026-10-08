import assert from "node:assert/strict";
import test from "node:test";
import { markTabVisited, updateTabConversation } from "../src/utils/tabNavigation.ts";

const room = (id: string, type: "PERSONAL" | "GROUP") => ({
  id,
  workspaceId: "workspace-1",
  type,
  name: `room-${id}`,
  memberIds: ["member-1"],
  adminId: "member-1",
});

test("tab visits add a destination without mutating the previous visited set", () => {
  const before = new Set(["home"] as const);
  const after = markTabVisited(before, "chat");

  assert.deepEqual([...before], ["home"]);
  assert.deepEqual([...after], ["home", "chat"]);
});

test("personal and group conversation state stays isolated by tab", () => {
  const personalRoom = room("personal-1", "PERSONAL");
  const groupRoom = room("group-1", "GROUP");
  const withPersonal = updateTabConversation({}, "chat", personalRoom);
  const withBoth = updateTabConversation(withPersonal, "group", groupRoom);

  assert.equal(withBoth.chat, personalRoom);
  assert.equal(withBoth.group, groupRoom);
  assert.deepEqual(withPersonal, { chat: personalRoom });
});

test("closing one conversation leaves other tabs' open conversations intact", () => {
  const personalRoom = room("personal-1", "PERSONAL");
  const groupRoom = room("group-1", "GROUP");
  const conversations = { chat: personalRoom, group: groupRoom };

  assert.deepEqual(updateTabConversation(conversations, "chat"), { group: groupRoom });
  assert.deepEqual(conversations, { chat: personalRoom, group: groupRoom });
});
