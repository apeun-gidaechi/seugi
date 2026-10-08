import assert from "node:assert/strict";
import test from "node:test";
import { workspaceInviteConfirmationTitle, workspaceInviteNeedsConfirmation } from "../src/utils/workspaceInviteConfirmation.ts";

test("only Android asks for confirmation before processing invite requests", () => {
  assert.equal(workspaceInviteNeedsConfirmation("android"), true);
  assert.equal(workspaceInviteNeedsConfirmation("ios"), false);
});

test("Android confirmation titles preserve native accept and reject wording", () => {
  assert.equal(workspaceInviteConfirmationTitle("approve"), "가입을 수락하시겠습니까?");
  assert.equal(workspaceInviteConfirmationTitle("reject"), "가입을 거절하시겠습니까?");
});
