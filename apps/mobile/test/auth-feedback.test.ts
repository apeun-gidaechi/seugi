import assert from "node:assert/strict";
import test from "node:test";
import { androidRegistrationFailureMessage, emailRegistrationAutoSignIn, emailVerificationFeedback, emailVerificationTimerStartsOnAttempt } from "../src/utils/authFeedback.ts";

test("email registration auto-signs-in on iOS but returns Android to the start route", () => {
  assert.equal(emailRegistrationAutoSignIn("ios"), true);
  assert.equal(emailRegistrationAutoSignIn("android"), false);
});

test("iOS starts the email resend timer on attempt while Android starts it after success", () => {
  assert.equal(emailVerificationTimerStartsOnAttempt("ios"), true);
  assert.equal(emailVerificationTimerStartsOnAttempt("android"), false);
});

test("Android registration maps native 400, 404, and 409 outcomes to invalid-code feedback", () => {
  for (const status of [400, 404, 409])
    assert.equal(androidRegistrationFailureMessage(status, "서버 메시지"), "인증 코드가 올바르지 않습니다");
  assert.equal(androidRegistrationFailureMessage(500, "서버 오류"), "서버 오류");
  assert.equal(androidRegistrationFailureMessage(undefined, "오프라인"), "오프라인");
});

test("Android shows the native code-sent confirmation", () => {
  assert.deepEqual(emailVerificationFeedback("android", "code-sent"), {
    title: "인증코드를 전송했어요",
    message: "이메일 함을 확인해 보세요",
  });
});

test("email verification failures use native platform dialogs", () => {
  assert.deepEqual(emailVerificationFeedback("android", "register-failed", true), {
    title: "인증코드가 올바르지 않습니다",
  });
  assert.deepEqual(emailVerificationFeedback("ios", "register-failed"), {
    title: "회원가입 실패",
    message: "잠시 후 다시 시도해 주세요",
  });
  assert.deepEqual(emailVerificationFeedback("ios", "send-failed"), {
    title: "이메일 전송 실패",
  });
});
