import assert from "node:assert/strict";
import test from "node:test";
import { canCreateWorkspaceNotice } from "../src/utils/workspaceNoticeAccess.ts";

const workspace = { ownerId: "owner-1" };

test("workspace owner can create notices", () => {
  assert.equal(canCreateWorkspaceNotice(workspace, "owner-1", "STUDENT"), true);
});

test("teachers and admins can create notices", () => {
  assert.equal(canCreateWorkspaceNotice(workspace, "t-1", "TEACHER"), true);
  assert.equal(canCreateWorkspaceNotice(workspace, "a-1", "ADMIN"), true);
});

test("students cannot create notices unless they own the workspace", () => {
  assert.equal(canCreateWorkspaceNotice(workspace, "s-1", "STUDENT"), false);
  assert.equal(canCreateWorkspaceNotice(workspace, undefined, "TEACHER"), false);
});
