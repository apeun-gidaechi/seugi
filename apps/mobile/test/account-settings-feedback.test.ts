import assert from "node:assert/strict";
import test from "node:test";
import {
  profileEditFeedback,
  withdrawFailureFeedback,
} from "../src/utils/accountSettingsFeedback.ts";

test("profile edits report native Android success via snackbar feedback", () => {
  assert.deepEqual(profileEditFeedback("android", true), {
    kind: "toast",
    message: "멤버 정보 변경 성공 !!",
  });
});

test("profile edits use native iOS success and failure alerts", () => {
  assert.deepEqual(profileEditFeedback("ios", true), {
    kind: "alert",
    title: "정보 수정 성공",
    message: undefined,
  });
  assert.deepEqual(profileEditFeedback("ios", false), {
    kind: "alert",
    title: "정보 수정 실패",
    message: "잠시 후 다시 시도해 주세요",
  });
  assert.deepEqual(profileEditFeedback("android", false), { kind: "silent" });
});

test("withdraw failures use the native Android snackbar message", () => {
  assert.deepEqual(withdrawFailureFeedback("android"), {
    kind: "toast",
    message: "회원탈퇴에 실패했습니다.",
  });
});

test("withdraw failures use the native iOS alert copy", () => {
  assert.deepEqual(withdrawFailureFeedback("ios"), {
    kind: "alert",
    title: "탈퇴 실패",
    message: "잠시 후 다시 시도해 주세요",
  });
});
