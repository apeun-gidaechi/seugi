export type WorkspaceJoinFailure = "search" | "request";

export function workspaceJoinFailureFeedback(
  platform: "ios" | "android",
  failure: WorkspaceJoinFailure,
  serverMessage?: string,
): { title: string; message?: string } {
  if (platform === "android") {
    return {
      title:
        serverMessage ||
        (failure === "search" ? "학교를 찾지 못했습니다" : "가입 신청에 실패했습니다"),
    };
  }
  return failure === "search"
    ? { title: "초대코드가 올바르지 않습니다", message: "다시 입력해주세요" }
    : { title: "가입 요청 실패", message: "잠시 후 다시 시도해 주세요" };
}
