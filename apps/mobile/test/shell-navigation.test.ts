import assert from "node:assert/strict";
import test from "node:test";
import {
  isWorkspaceJoinDetail,
  shellRouteKey,
  shellShowsMainTopBar,
} from "../src/navigation/shellNavigation.ts";

test("workspace join detail detection covers the join flow stack", () => {
  assert.equal(isWorkspaceJoinDetail("workspaceJoinCode"), true);
  assert.equal(isWorkspaceJoinDetail("workspace"), false);
});

test("shell route keys include tab, stack, and open conversation", () => {
  assert.equal(shellRouteKey("chat", ["workspace"], "room-1"), "chat:workspace:room-1");
});

test("main top bar hides for fullscreen flows and open conversations", () => {
  assert.equal(shellShowsMainTopBar(undefined, false), true);
  assert.equal(shellShowsMainTopBar("workspace", false), true);
  assert.equal(shellShowsMainTopBar("createNotice", false), false);
  assert.equal(shellShowsMainTopBar("workspaceJoinCode", false), false);
  assert.equal(shellShowsMainTopBar(undefined, true), false);
});
