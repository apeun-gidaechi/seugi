import type { WorkspaceMemberView } from "@seugi/contracts";

/** Matches the native ProfileModel.nameAndNick presentation. */
export function workspaceMemberDisplayName(member: Pick<WorkspaceMemberView, "name" | "nick">) {
  return member.nick ? `${member.name} (${member.nick})` : member.name;
}
