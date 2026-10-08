export function workspaceInviteNeedsConfirmation(platform: "android" | "ios") {
  return platform === "android";
}

export function workspaceInviteConfirmationTitle(action: "approve" | "reject") {
  return action === "approve" ? "가입을 수락하시겠습니까?" : "가입을 거절하시겠습니까?";
}
