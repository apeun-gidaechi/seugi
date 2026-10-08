export type ProfileFieldFeedbackPlatform = "android" | "ios";

export function profileFieldFeedback(
  platform: ProfileFieldFeedbackPlatform,
  field: string,
  succeeded: boolean,
  error: unknown,
) {
  if (platform === "ios") {
    return succeeded
      ? { kind: "alert" as const, title: `${field} 수정 성공` }
      : { kind: "alert" as const, title: `${field} 수정 실패` };
  }

  if (succeeded) return { kind: "silent" as const };
  return {
    kind: "toast" as const,
    message: error instanceof Error ? error.message : "",
  };
}
