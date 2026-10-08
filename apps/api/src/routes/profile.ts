import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  API_SPEC,
  editProfileSchema,
  editStudentNumberSchema,
  otherProfileQuerySchema,
  profileWorkspaceQuerySchema,
  workspaceIdParamSchema,
  type Profile,
  type Role,
  type Workspace,
} from "@seugi/contracts";
import type { Store } from "../store.js";
import { body, ok, query } from "../http/helpers.js";

const workspaceParam = workspaceIdParamSchema;

export function registerProfileRoutes(
  app: FastifyInstance,
  deps: {
    store: Store;
    auth: (request: FastifyRequest) => Promise<void>;
    roleIn: (workspace: Workspace, memberId: string) => Role | undefined;
    legacyProfile: (profile: Profile) => Record<string, unknown>;
  },
) {
  const { store, auth, roleIn, legacyProfile } = deps;

app.patch(
  API_SPEC.editProfile.path,
  { preHandler: auth },
  async (request) => {
    const workspaceId = workspaceParam.parse(request.params).workspaceId;
    if (!store.canAccess(workspaceId, request.user.sub))
      throw new Error("권한이 없습니다");
    const member = store.requireMember(request.user.sub);
    const key = `${workspaceId}:${member.id}`;
    const existing = store.profiles.get(key);
    const profile: Profile = {
      ...member,
      workspaceId,
      ...existing,
      ...editProfileSchema.parse(request.body),
      role:
        roleIn(store.requireWorkspace(workspaceId), member.id) ??
        existing?.role ??
        "STUDENT",
    };
    store.profiles.set(key, profile);
    return ok("프로필 수정 성공");
  },
);
app.patch(
  API_SPEC.editStudentNumber.path,
  { preHandler: auth },
  async (request) => {
    const workspaceId = workspaceParam.parse(request.params).workspaceId;
    const workspace = store.requireWorkspace(workspaceId);
    const input = body(editStudentNumberSchema, request);
    const memberId = input.id ?? request.user.sub;
    const actorRole = roleIn(workspace, request.user.sub) ?? "STUDENT";
    if (
      !workspace.members.includes(request.user.sub) ||
      !workspace.members.includes(memberId) ||
      actorRole === "STUDENT"
    )
      throw new Error("권한이 없습니다");
    const member = store.requireMember(memberId);
    const existing = store.profiles.get(`${workspaceId}:${member.id}`) ?? {
      ...member,
      workspaceId,
      role: roleIn(workspace, member.id) ?? ("STUDENT" as const),
    };
    store.profiles.set(`${workspaceId}:${member.id}`, {
      ...existing,
      grade: input.grade ?? input.schGrade!,
      class: input.class ?? input.schClass!,
      number: input.number ?? input.schNumber!,
    });
    return ok("학번 수정 성공");
  },
);
app.get(API_SPEC.myProfile.path, { preHandler: auth }, async (request) => {
  const workspaceId = query(profileWorkspaceQuerySchema, request).workspaceId;
  if (!store.canAccess(workspaceId, request.user.sub))
    throw new Error("권한이 없습니다");
  return ok(
    "프로필 조회 성공",
    legacyProfile(
      store.profiles.get(`${workspaceId}:${request.user.sub}`) ?? {
        ...store.requireMember(request.user.sub),
        workspaceId,
        role: "STUDENT" satisfies Role,
      },
    ),
  );
});
app.get(
  API_SPEC.workspaceMember.path,
  { preHandler: auth },
  async (request) => {
    const input = query(otherProfileQuerySchema, request);
    const workspace = store.requireWorkspace(input.workspaceId);
    if (
      !workspace.members.includes(request.user.sub) ||
      !workspace.members.includes(input.memberId)
    )
      throw new Error("권한이 없습니다");
    const member = store.requireMember(input.memberId);
    return ok(
      "프로필 조회 성공",
      legacyProfile(
        store.profiles.get(`${workspace.id}:${input.memberId}`) ?? {
          ...member,
          workspaceId: workspace.id,
          role: roleIn(workspace, member.id) ?? "STUDENT",
        },
      ),
    );
  },
);

}
