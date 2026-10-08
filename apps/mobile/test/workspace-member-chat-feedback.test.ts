import assert from "node:assert/strict";
import test from "node:test";
import { workspaceMemberChatFailureFeedback } from "../src/utils/workspaceMemberChatFeedback.ts";

test("Android personal-chat failures use the native snackbar message", () => {
  assert.deepEqual(workspaceMemberChatFailureFeedback("android"), {
    kind: "snackbar",
    message: "채팅방 이동에 실패했습니다.",
  });
});

test("iOS personal-chat failures remain silent like the native flow", () => {
  assert.deepEqual(workspaceMemberChatFailureFeedback("ios"), { kind: "silent" });
});
