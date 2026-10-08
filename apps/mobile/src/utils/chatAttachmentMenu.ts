export type ChatAttachmentAction = "image" | "file";
export type ChatAttachmentPlatform = "android" | "ios";

export function chatAttachmentMenuItems(platform: ChatAttachmentPlatform) {
  return platform === "android"
    ? [
        { action: "file" as const, label: "파일 업로드" },
        { action: "image" as const, label: "이미지 업로드" },
      ]
    : [
        { action: "image" as const, label: "이미지" },
        { action: "file" as const, label: "파일" },
      ];
}
