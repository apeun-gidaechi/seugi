import assert from "node:assert/strict";
import test from "node:test";
import { profileFieldFeedback } from "../src/utils/profileFieldFeedback.ts";

test("Android profile field saves are silent on success and surface native error text on failure", () => {
  assert.deepEqual(profileFieldFeedback("android", "닉네임", true, undefined), { kind: "silent" });
  assert.deepEqual(profileFieldFeedback("android", "닉네임", false, new Error("저장 실패")), {
    kind: "toast",
    message: "저장 실패",
  });
});

test("iOS profile field saves use field-specific native success and failure alerts", () => {
  assert.deepEqual(profileFieldFeedback("ios", "휴대전화번호", true, undefined), {
    kind: "alert",
    title: "휴대전화번호 수정 성공",
  });
  assert.deepEqual(profileFieldFeedback("ios", "휴대전화번호", false, new Error("server detail")), {
    kind: "alert",
    title: "휴대전화번호 수정 실패",
  });
});
