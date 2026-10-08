export type EmailVerificationEvent = "code-sent" | "send-failed" | "register-failed";

export function emailRegistrationAutoSignIn(platform: string): boolean {
  return platform !== "android";
}

export function emailVerificationTimerStartsOnAttempt(platform: string): boolean {
  return platform === "ios";
}

export function androidRegistrationFailureMessage(
  status: number | undefined,
  fallback: string,
): string {
  return status === 400 || status === 404 || status === 409
    ? "인증 코드가 올바르지 않습니다"
    : fallback;
}

export function emailVerificationFeedback(
  platform: string,
  event: EmailVerificationEvent,
  invalidCode = false,
): { title: string; message?: string } {
  if (platform === "android") {
    if (event === "code-sent")
      return { title: "인증코드를 전송했어요", message: "이메일 함을 확인해 보세요" };
    if (event === "register-failed" && invalidCode)
      return { title: "인증코드가 올바르지 않습니다" };
    return { title: "오류가 발생했습니다. 다시시도 해주세요" };
  }

  return event === "send-failed"
    ? { title: "이메일 전송 실패" }
    : { title: "회원가입 실패", message: "잠시 후 다시 시도해 주세요" };
}
