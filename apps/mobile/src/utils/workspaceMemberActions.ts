import type { Role } from "@seugi/contracts";

export type WorkspaceMemberActionAvailability = {
  promote: boolean;
  editStudentInfo: boolean;
  remove: boolean;
};

export function workspaceMemberActionAvailability({
  actorRole,
  memberRole,
  isOwner,
  isOwnerTarget,
  canManageMembers,
}: {
  actorRole: Role;
  memberRole: Role;
  isOwner: boolean;
  isOwnerTarget: boolean;
  canManageMembers: boolean;
}): WorkspaceMemberActionAvailability {
  return {
    promote: isOwner && memberRole === "TEACHER",
    editStudentInfo: canManageMembers && memberRole === "STUDENT",
    remove:
      memberRole !== "STUDENT" &&
      !isOwnerTarget &&
      (isOwner ||
        (actorRole === "MIDDLE_ADMIN" && memberRole !== "MIDDLE_ADMIN" && memberRole !== "ADMIN")),
  };
}
