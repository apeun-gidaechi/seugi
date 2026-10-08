import type { z } from "zod";
import type { createWorkspaceSchema, Profile, Role, Workspace } from "@seugi/contracts";
import type { Store, WaitlistRole } from "../store.js";

export function createWorkspacePresentation(store: Store) {
  const roleIn = (
    workspace: { id: string; ownerId: string },
    memberId: string,
  ): Role | undefined =>
    workspace.ownerId === memberId
      ? "ADMIN"
      : store.profiles.get(`${workspace.id}:${memberId}`)?.role;

  const legacyRole = (role?: Role) => role;

  const legacyProfile = (profile: Profile) => ({
    ...profile,
    member: {
      id: profile.id,
      email: profile.email,
      birth: profile.birth ?? "",
      name: profile.name,
      picture: profile.picture ?? null,
    },
    permission: legacyRole(profile.role),
    profileImage: profile.picture ?? "",
    schGrade: profile.grade,
    schClass: profile.class,
    schNumber: profile.number,
  });

  const legacyWorkspace = (workspace: Workspace) => ({
    ...workspace,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    workspaceImageUrl: workspace.image ?? "",
    workspaceAdmin: workspace.ownerId,
    middleAdmin: workspace.members.filter(
      (id) => id !== workspace.ownerId && roleIn(workspace, id) === "MIDDLE_ADMIN",
    ),
    teacher: workspace.members.filter((id) => roleIn(workspace, id) === "TEACHER"),
    student: workspace.members.filter((id) => roleIn(workspace, id) === "STUDENT"),
  });

  const legacyWorkspaceMember = (workspace: Workspace, memberId: string) => {
    const member = store.requireMember(memberId);
    const profile = store.profiles.get(`${workspace.id}:${memberId}`) ?? {
      ...member,
      workspaceId: workspace.id,
      role: roleIn(workspace, memberId) ?? ("STUDENT" as const),
    };
    return {
      ...legacyProfile(profile),
      status: profile.status ?? "",
      member: {
        id: member.id,
        email: member.email,
        name: member.name,
        nick: profile.nick ?? member.name,
        picture: member.picture ?? "",
        spot: profile.spot ?? "",
        belong: profile.belong ?? "",
        phone: profile.phone ?? "",
        wire: profile.wire ?? "",
        location: profile.location ?? "",
        permission: legacyRole(profile.role),
        schGrade: profile.grade,
        schClass: profile.class,
        schNumber: profile.number,
      },
    };
  };

  const canManageWorkspace = (
    workspace: { id: string; ownerId: string },
    memberId: string,
  ) => ["ADMIN", "MIDDLE_ADMIN"].includes(roleIn(workspace, memberId) ?? "");

  const canApproveRole = (
    workspace: { id: string; ownerId: string },
    memberId: string,
    role: "STUDENT" | "TEACHER" | "MIDDLE_ADMIN",
  ) =>
    role === "STUDENT"
      ? roleIn(workspace, memberId) !== "STUDENT" && !!roleIn(workspace, memberId)
      : role === "TEACHER"
        ? canManageWorkspace(workspace, memberId)
        : workspace.ownerId === memberId;

  const pendingRoles = (workspace: Workspace, memberId: string): WaitlistRole[] =>
    store.waitlistRoles.get(`${workspace.id}:${memberId}`) ??
    (workspace.waitlist.includes(memberId) ? ["STUDENT"] : []);

  const removePendingRole = (workspace: Workspace, memberId: string, role: WaitlistRole) => {
    const roles = pendingRoles(workspace, memberId).filter((item) => item !== role);
    if (roles.length) store.waitlistRoles.set(`${workspace.id}:${memberId}`, roles);
    else {
      store.waitlistRoles.delete(`${workspace.id}:${memberId}`);
      workspace.waitlist = workspace.waitlist.filter((id) => id !== memberId);
    }
    return roles;
  };

  const normalizeWorkspaceInput = (input: z.infer<typeof createWorkspaceSchema>) => ({
    name: input.name ?? input.workspaceName!,
    schoolCode: input.schoolCode,
    educationOfficeCode: input.educationOfficeCode,
    schoolType: input.schoolType,
    image: input.image ?? (input.workspaceImageUrl || input.workspaceImgUrl || undefined),
  });

  return {
    roleIn,
    legacyRole,
    legacyProfile,
    legacyWorkspace,
    legacyWorkspaceMember,
    canManageWorkspace,
    canApproveRole,
    pendingRoles,
    removePendingRole,
    normalizeWorkspaceInput,
  };
}
