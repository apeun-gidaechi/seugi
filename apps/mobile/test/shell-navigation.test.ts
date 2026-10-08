import assert from "node:assert/strict";
import test from "node:test";
import { isWorkspaceJoinDetail, shellRouteKey } from "../src/navigation/shellNavigation.ts";

test("workspace join detail detection covers the join flow stack", () => {
  assert.equal(isWorkspaceJoinDetail("workspaceJoinCode"), true);
  assert.equal(isWorkspaceJoinDetail("workspace"), false);
});

test("shell route keys include tab, stack, and open conversation", () => {
  assert.equal(shellRouteKey("chat", ["workspace"], "room-1"), "chat:workspace:room-1");
});
