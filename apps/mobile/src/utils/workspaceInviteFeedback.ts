export type WorkspaceInviteAction = "approve" | "reject";
export type WorkspaceInviteOutcome = "success" | "failure";

export function workspaceInviteFeedback(
  platform: "android" | "ios",
  action: WorkspaceInviteAction,
  outcome: WorkspaceInviteOutcome,
) {
  const actionLabel = action === "approve" ? "수락" : "거절";
  if (platform === "ios") {
    return {
      kind: "alert" as const,
      title: `가입 ${actionLabel} ${outcome === "success" ? "성공" : "실패"}`,
      ...(outcome === "failure" ? { message: "잠시 후 다시 시도해 주세요" } : {}),
    };
  }
  return {
    kind: "toast" as const,
    message:
      outcome === "success"
        ? `참가 ${actionLabel}에 성공했습니다!`
        : `참가 ${actionLabel}에 실패했습니다.`,
  };
}
