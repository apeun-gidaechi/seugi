import assert from "node:assert/strict";
import test from "node:test";
import { workspaceJoinFailureFeedback } from "../src/utils/workspaceJoinFeedback.ts";

test("iOS join failures use the native alert wording for code lookup and application", () => {
  assert.deepEqual(workspaceJoinFailureFeedback("ios", "search", "not found"), {
    title: "초대코드가 올바르지 않습니다",
    message: "다시 입력해주세요",
  });
  assert.deepEqual(workspaceJoinFailureFeedback("ios", "request", "forbidden"), {
    title: "가입 요청 실패",
    message: "잠시 후 다시 시도해 주세요",
  });
});

test("Android join failures retain the server's toast message", () => {
  assert.deepEqual(
    workspaceJoinFailureFeedback("android", "search", "초대 코드를 찾을 수 없습니다"),
    {
      title: "초대 코드를 찾을 수 없습니다",
    },
  );
});
