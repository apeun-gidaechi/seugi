export type AccountSettingsPlatform = "android" | "ios";

export function profileEditFeedback(platform: AccountSettingsPlatform, succeeded: boolean) {
  if (platform === "ios") {
    return succeeded
      ? { kind: "alert" as const, title: "정보 수정 성공", message: undefined }
      : { kind: "alert" as const, title: "정보 수정 실패", message: "잠시 후 다시 시도해 주세요" };
  }
  return succeeded
    ? { kind: "toast" as const, message: "멤버 정보 변경 성공 !!" }
    : { kind: "silent" as const };
}

export function withdrawFailureFeedback(platform: AccountSettingsPlatform) {
  return platform === "ios"
    ? { kind: "alert" as const, title: "탈퇴 실패", message: "잠시 후 다시 시도해 주세요" }
    : { kind: "toast" as const, message: "회원탈퇴에 실패했습니다." };
}
