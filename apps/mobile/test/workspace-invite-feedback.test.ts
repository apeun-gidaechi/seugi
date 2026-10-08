import assert from "node:assert/strict";
import test from "node:test";
import { workspaceInviteFeedback } from "../src/utils/workspaceInviteFeedback.ts";

test("Android invite request results retain the native toast copy", () => {
  assert.deepEqual(workspaceInviteFeedback("android", "approve", "success"), {
    kind: "toast",
    message: "참가 수락에 성공했습니다!",
  });
  assert.deepEqual(workspaceInviteFeedback("android", "reject", "failure"), {
    kind: "toast",
    message: "참가 거절에 실패했습니다.",
  });
});

test("iOS invite request results retain native alert titles and retry copy", () => {
  assert.deepEqual(workspaceInviteFeedback("ios", "approve", "success"), {
    kind: "alert",
    title: "가입 수락 성공",
  });
  assert.deepEqual(workspaceInviteFeedback("ios", "reject", "failure"), {
    kind: "alert",
    title: "가입 거절 실패",
    message: "잠시 후 다시 시도해 주세요",
  });
});
