export function workspaceMemberChatFailureFeedback(platform: "android" | "ios") {
  return platform === "android"
    ? { kind: "snackbar" as const, message: "채팅방 이동에 실패했습니다." }
    : { kind: "silent" as const };
}
