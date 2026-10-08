import type { SeugiTab } from "../design-system/BottomNavigation";

export const NO_WORKSPACE_APPROVAL_POLL_MS = 10_000;

export type NoWorkspaceRegistrationAction = "join" | "create";

export function noWorkspaceRegistrationActionOrder(
  platform: "ios" | "android",
): NoWorkspaceRegistrationAction[] {
  return platform === "android" ? ["create", "join"] : ["join", "create"];
}

export function noWorkspaceInitialCreateRoomDetail(
  platform: "ios" | "android",
  tab: SeugiTab,
): "workspaceMembers" | "createRoom" {
  return tab === "chat" && platform === "ios" ? "workspaceMembers" : "createRoom";
}
