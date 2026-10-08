import type { Role, Workspace } from "@seugi/contracts";

export function canCreateWorkspaceNotice(
  workspace: Pick<Workspace, "ownerId">,
  memberId: string | undefined,
  role: Role | undefined,
): boolean {
  if (!memberId) return false;
  if (workspace.ownerId === memberId) return true;
  return !!role && role !== "STUDENT";
}
