import assert from "node:assert/strict";
import test from "node:test";
import { Store } from "../src/store.js";
import { createWorkspacePresentation } from "../src/workspace/presentation.js";

test("workspace owner resolves as ADMIN and members use stored profile roles", () => {
  const store = new Store();
  const ownerId = "owner-1";
  const teacherId = "teacher-1";
  const workspace = {
    id: "ws-1",
    code: "ABCDEF",
    name: "테스트 학교",
    ownerId,
    members: [ownerId, teacherId],
    waitlist: [],
  };
  store.workspaces.set(workspace.id, workspace);
  store.members.set(ownerId, { id: ownerId, email: "o@example.com", name: "관리자" });
  store.members.set(teacherId, { id: teacherId, email: "t@example.com", name: "선생님" });
  store.profiles.set(`${workspace.id}:${teacherId}`, {
    id: teacherId,
    email: "t@example.com",
    name: "선생님",
    workspaceId: workspace.id,
    role: "TEACHER",
  });

  const { roleIn, legacyWorkspace, canManageWorkspace } = createWorkspacePresentation(store);
  assert.equal(roleIn(workspace, ownerId), "ADMIN");
  assert.equal(roleIn(workspace, teacherId), "TEACHER");
  assert.equal(canManageWorkspace(workspace, ownerId), true);
  assert.equal(canManageWorkspace(workspace, teacherId), false);

  const legacy = legacyWorkspace(workspace);
  assert.equal(legacy.workspaceId, workspace.id);
  assert.deepEqual(legacy.teacher, [teacherId]);
  assert.equal(legacy.student.length, 0);
});
