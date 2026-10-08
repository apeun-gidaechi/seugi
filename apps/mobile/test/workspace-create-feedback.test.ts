import assert from "node:assert/strict";
import test from "node:test";
import { workspaceCreateFeedback } from "../src/utils/workspaceCreateFeedback.ts";

test("workspace creation success feedback matches Android toast and iOS alert", () => {
  assert.deepEqual(workspaceCreateFeedback("android", "success"), {
    kind: "toast",
    message: "워크페이스가 성공적으로 등록되었습니다.",
  });
  assert.deepEqual(workspaceCreateFeedback("ios", "success"), {
    kind: "alert",
    title: "학교 등록 성공",
  });
});

test("workspace creation failures retain platform-native messages", () => {
  assert.deepEqual(workspaceCreateFeedback("android", "failure", "denied"), {
    kind: "toast",
    message: "denied",
  });
  assert.deepEqual(workspaceCreateFeedback("ios", "failure"), {
    kind: "alert",
    title: "학교 등록 실패",
    message: "잠시 후 다시 시도해 주세요",
  });
});

test("image upload failures are alerted on iOS and silent on Android", () => {
  assert.deepEqual(workspaceCreateFeedback("android", "imageUploadFailure"), {
    kind: "silent",
  });
  assert.deepEqual(workspaceCreateFeedback("ios", "imageUploadFailure"), {
    kind: "alert",
    title: "이미지 업로드 실패",
    message: "잠시 후 다시 시도해 주세요",
  });
});
