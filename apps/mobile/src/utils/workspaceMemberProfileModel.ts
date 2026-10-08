import type { LegacyProfile, WorkspaceMemberView } from "@seugi/contracts";

export function workspaceMemberProfileModel(member: WorkspaceMemberView): LegacyProfile {
  const birth = member.birth ?? "";
  const picture = member.member.picture || null;
  return {
    ...member,
    id: member.member.id,
    email: member.member.email,
    birth,
    name: member.member.name,
    picture: member.member.picture,
    role: member.permission,
    grade: member.schGrade ?? member.grade,
    class: member.schClass ?? member.class,
    number: member.schNumber ?? member.number,
    permission: member.permission,
    profileImage: member.profileImage ?? member.member.picture,
    member: {
      id: member.member.id,
      email: member.member.email,
      birth,
      name: member.member.name,
      picture,
    },
  };
}
