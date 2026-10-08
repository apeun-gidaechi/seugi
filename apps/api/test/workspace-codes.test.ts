import assert from "node:assert/strict";
import test from "node:test";
import { WORKSPACE_CODE_ALPHABET, createWorkspaceInviteCode } from "../src/workspace/codes.js";

test("workspace invite codes use the native six-character alphabet", () => {
  const code = createWorkspaceInviteCode();
  assert.equal(code.length, 6);
  assert.match(code, new RegExp(`^[${WORKSPACE_CODE_ALPHABET}]+$`));
});
