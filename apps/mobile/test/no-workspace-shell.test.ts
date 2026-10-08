import assert from "node:assert/strict";
import test from "node:test";
import {
  NO_WORKSPACE_APPROVAL_POLL_MS,
  noWorkspaceInitialCreateRoomDetail,
  noWorkspaceRegistrationActionOrder,
} from "../src/utils/noWorkspaceShell.ts";

test("no-workspace registration alert button order matches platform rules", () => {
  assert.deepEqual(noWorkspaceRegistrationActionOrder("android"), ["create", "join"]);
  assert.deepEqual(noWorkspaceRegistrationActionOrder("ios"), ["join", "create"]);
});

test("no-workspace chat add targets members on iOS only", () => {
  assert.equal(noWorkspaceInitialCreateRoomDetail("ios", "chat"), "workspaceMembers");
  assert.equal(noWorkspaceInitialCreateRoomDetail("android", "chat"), "createRoom");
  assert.equal(noWorkspaceInitialCreateRoomDetail("ios", "group"), "createRoom");
});

test("approval poll interval stays at ten seconds", () => {
  assert.equal(NO_WORKSPACE_APPROVAL_POLL_MS, 10_000);
});
