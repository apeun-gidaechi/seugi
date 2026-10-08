import assert from "node:assert/strict";
import test from "node:test";
import { workspaceMemberActionAvailability } from "../src/utils/workspaceMemberActions.ts";

test("workspace owners can promote teachers and remove non-student members, but not themselves", () => {
  assert.deepEqual(workspaceMemberActionAvailability({
    actorRole: "ADMIN",
    memberRole: "TEACHER",
    isOwner: true,
    isOwnerTarget: false,
    canManageMembers: true,
  }), { promote: true, editStudentInfo: false, remove: true });
  assert.equal(workspaceMemberActionAvailability({
    actorRole: "ADMIN",
    memberRole: "ADMIN",
    isOwner: true,
    isOwnerTarget: true,
    canManageMembers: true,
  }).remove, false);
});

test("member managers can edit student records while students cannot", () => {
  assert.deepEqual(workspaceMemberActionAvailability({
    actorRole: "MIDDLE_ADMIN",
    memberRole: "STUDENT",
    isOwner: false,
    isOwnerTarget: false,
    canManageMembers: true,
  }), { promote: false, editStudentInfo: true, remove: false });
  assert.equal(workspaceMemberActionAvailability({
    actorRole: "STUDENT",
    memberRole: "STUDENT",
    isOwner: false,
    isOwnerTarget: false,
    canManageMembers: false,
  }).editStudentInfo, false);
});

test("middle admins may remove regular teachers but not admins or fellow middle admins", () => {
  const options = { actorRole: "MIDDLE_ADMIN" as const, isOwner: false, isOwnerTarget: false, canManageMembers: true };
  assert.equal(workspaceMemberActionAvailability({ ...options, memberRole: "TEACHER" }).remove, true);
  assert.equal(workspaceMemberActionAvailability({ ...options, memberRole: "ADMIN" }).remove, false);
  assert.equal(workspaceMemberActionAvailability({ ...options, memberRole: "MIDDLE_ADMIN" }).remove, false);
});
