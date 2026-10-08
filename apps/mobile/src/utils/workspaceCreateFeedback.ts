export type WorkspaceCreatePlatform = "android" | "ios";
export type WorkspaceCreateResult = "success" | "failure" | "imageUploadFailure";

export function workspaceCreateFeedback(
  platform: WorkspaceCreatePlatform,
  result: WorkspaceCreateResult,
  errorMessage?: string,
) {
  if (platform === "ios") {
    if (result === "success") {
      return { kind: "alert" as const, title: "학교 등록 성공" };
    }
    return {
      kind: "alert" as const,
      title: result === "failure" ? "학교 등록 실패" : "이미지 업로드 실패",
      message: "잠시 후 다시 시도해 주세요",
    };
  }

  if (result === "imageUploadFailure") return { kind: "silent" as const };
  return {
    kind: "toast" as const,
    message:
      result === "success"
        ? "워크페이스가 성공적으로 등록되었습니다."
        : errorMessage || "워크스페이스 생성에 실패했습니다",
  };
}
