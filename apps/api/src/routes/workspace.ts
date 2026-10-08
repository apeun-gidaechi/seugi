import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  API_SPEC,
  createWorkspaceSchema,
  joinWorkspaceSchema,
  kickWorkspaceMembersSchema,
  updateWorkspaceMemberRoleSchema,
  updateWorkspaceSchema,
  workspaceCodeParamSchema,
  workspaceIdParamSchema,
  workspaceNotificationsSchema,
  workspaceWaitlistActionSchema,
  workspaceWaitlistQuerySchema,
  profileWorkspaceQuerySchema,
  type Role,
  type Workspace,
  type WorkspaceMemberChartProfile,
} from "@seugi/contracts";
import type { Store } from "../store.js";
import type { NeisClient } from "../neis.js";
import type { PushNotifications } from "../push.js";
import { createWorkspaceInviteCode } from "../workspace/codes.js";
import { body, ok, query } from "../http/helpers.js";

const workspaceParam = workspaceIdParamSchema;

export type WorkspacePresentation = ReturnType<
  typeof import("../workspace/presentation.js").createWorkspacePresentation
>;

export function registerWorkspaceRoutes(
  app: FastifyInstance,
  deps: {
    store: Store;
    neis: NeisClient;
    push: PushNotifications;
    auth: (request: FastifyRequest) => Promise<void>;
    presentation: WorkspacePresentation;
  },
) {
  const { store, neis, push, auth, presentation } = deps;
  const {
    roleIn,
    legacyRole,
    legacyWorkspace,
    legacyWorkspaceMember,
    canManageWorkspace,
    canApproveRole,
    pendingRoles,
    removePendingRole,
    normalizeWorkspaceInput,
  } = presentation;

const workspacePushTokens = (
  workspace: { id: string },
  memberIds: string[],
  excludedMemberId?: string,
) => store.pushTokensForWorkspace(workspace.id, memberIds, excludedMemberId);
app.post(
  API_SPEC.createWorkspace.path,
  { preHandler: auth },
  async (request) => {
    const input = normalizeWorkspaceInput(
      body(createWorkspaceSchema, request),
    );
    const schoolInfo = await neis.schoolInfo(input.name);
    let code = createWorkspaceInviteCode();
    while ([...store.workspaces.values()].some((workspace) => workspace.code === code)) {
      code = createWorkspaceInviteCode();
    }
    const workspace = {
      id: store.id(),
      code,
      ownerId: request.user.sub,
      members: [request.user.sub],
      waitlist: [],
      ...input,
      schoolCode: input.schoolCode ?? schoolInfo.schoolCode,
      educationOfficeCode: input.educationOfficeCode ?? schoolInfo.educationOfficeCode,
      schoolType: input.schoolType ?? schoolInfo.schoolType,
    };
    store.workspaces.set(workspace.id, workspace);
    return ok("워크스페이스 생성 성공", workspace.id);
  },
);
app.get(API_SPEC.listWorkspaces.path, { preHandler: auth }, async (request) =>
  ok(
    "워크스페이스 조회 성공",
    [...store.workspaces.values()]
      .filter(
        (item) =>
          item.status !== "DELETE" && item.members.includes(request.user.sub),
      )
      .map(legacyWorkspace),
  ),
);
app.get(
  API_SPEC.workspaceDetails.path,
  { preHandler: auth },
  async (request) => {
    const id = workspaceParam.parse(request.params).workspaceId;
    const workspace = store.requireWorkspace(id);
    if (!workspace.members.includes(request.user.sub))
      throw new Error("WORKSPACE_NOT_FOUND");
    return ok("워크스페이스 조회 성공", legacyWorkspace(workspace));
  },
);
app.get(
  API_SPEC.workspaceNotificationPreference.path,
  { preHandler: auth },
  async (request) => {
    const workspace = store.requireWorkspace(
      workspaceParam.parse(request.params).workspaceId,
    );
    if (!workspace.members.includes(request.user.sub))
      throw new Error("권한이 없습니다");
    return ok(
      "알림 수신 설정 조회 성공",
      store.workspacePushPreferences.get(
        `${workspace.id}:${request.user.sub}`,
      ) ?? true,
    );
  },
);
app.patch(
  API_SPEC.setWorkspaceNotificationPreference.path,
  { preHandler: auth },
  async (request) => {
    const workspace = store.requireWorkspace(
      workspaceParam.parse(request.params).workspaceId,
    );
    if (!workspace.members.includes(request.user.sub))
      throw new Error("권한이 없습니다");
    const receivePush = body(
      workspaceNotificationsSchema,
      request,
    ).receivePush;
    store.workspacePushPreferences.set(
      `${workspace.id}:${request.user.sub}`,
      receivePush,
    );
    return ok("알림 수신 설정 변경 성공", receivePush);
  },
);
app.delete(
  API_SPEC.deleteWorkspace.path,
  { preHandler: auth },
  async (request) => {
    const workspace = store.requireWorkspace(
      workspaceParam.parse(request.params).workspaceId,
    );
    if (workspace.ownerId !== request.user.sub)
      throw new Error("권한이 없습니다");
    workspace.status = "DELETE";
    return ok("워크스페이스 삭제 성공");
  },
);
app.get(
  API_SPEC.workspaceCode.path,
  { preHandler: auth },
  async (request) => {
    const workspace = store.requireWorkspace(
      workspaceParam.parse(request.params).workspaceId,
    );
    const role = roleIn(workspace, request.user.sub);
    if (
      !workspace.members.includes(request.user.sub) ||
      !["ADMIN", "MIDDLE_ADMIN", "TEACHER"].includes(role ?? "")
    )
      throw new Error("권한이 없습니다");
    return ok("초대 코드 조회 성공", workspace.code);
  },
);
app.get(
  API_SPEC.searchWorkspace.path,
  async (request) => {
    const workspace = [...store.workspaces.values()].find(
      (item) =>
        item.status !== "DELETE" &&
        item.code === workspaceCodeParamSchema.parse(request.params).code,
    );
    if (!workspace) throw new Error("WORKSPACE_NOT_FOUND");
    const summary = legacyWorkspace(workspace);
    return ok("워크스페이스 검색 성공", {
      workspaceId: summary.workspaceId,
      workspaceName: summary.workspaceName,
      workspaceImageUrl: summary.workspaceImageUrl,
      studentCount: summary.student.length,
      teacherCount: summary.teacher.length + summary.middleAdmin.length + 1,
    });
  },
);
app.post(
  API_SPEC.joinWorkspace.path,
  { preHandler: auth },
  async (request) => {
    const input = body(joinWorkspaceSchema, request);
    const code = input.code ?? input.workspaceCode;
    const workspace = input.workspaceId
      ? store.requireWorkspace(input.workspaceId)
      : [...store.workspaces.values()].find(
          (item) => item.status !== "DELETE" && item.code === code,
        );
    if (!workspace || (code && workspace.code !== code))
      throw new Error("WORKSPACE_NOT_FOUND");
    if (!workspace.members.includes(request.user.sub)) {
      if (!workspace.waitlist.includes(request.user.sub))
        workspace.waitlist.push(request.user.sub);
      const roles = pendingRoles(workspace, request.user.sub);
      if (!roles.includes(input.role))
        store.waitlistRoles.set(`${workspace.id}:${request.user.sub}`, [...roles, input.role]);
    }
    return ok("가입 신청 성공");
  },
);
app.patch(
  API_SPEC.approveWorkspaceMembers.path,
  { preHandler: auth },
  async (request) => {
    const input = body(workspaceWaitlistActionSchema, request);
    const workspace = store.requireWorkspace(input.workspaceId);
    if (!canApproveRole(workspace, request.user.sub, input.role))
      throw new Error("권한이 없습니다");
    const memberIds = [
      ...new Set([
        ...(input.memberId ? [input.memberId] : []),
        ...input.memberIds,
        ...input.userSet,
      ]),
    ];
    if (!memberIds.length) throw new Error("MEMBER_NOT_FOUND");
    for (const memberId of memberIds) {
      if (!pendingRoles(workspace, memberId).includes(input.role))
        throw new Error("MEMBER_NOT_FOUND");
      removePendingRole(workspace, memberId, input.role);
      if (!workspace.members.includes(memberId))
        workspace.members.push(memberId);
      const member = store.requireMember(memberId);
      const previous = store.profiles.get(`${workspace.id}:${memberId}`);
      store.profiles.set(`${workspace.id}:${memberId}`, {
        ...member,
        workspaceId: workspace.id,
        ...previous,
        role: input.role,
      });
      void push
        .send(workspacePushTokens(workspace, [memberId]), {
          title: workspace.name,
          body: "워크스페이스 가입이 승인되었습니다.",
          imageUrl: workspace.image,
        })
        .catch((error) => app.log.error(error, "FCM workspace push failed"));
    }
    return ok("가입 승인 성공");
  },
);
app.delete(
  API_SPEC.rejectWorkspaceMembers.path,
  { preHandler: auth },
  async (request) => {
    const input = body(workspaceWaitlistActionSchema, request);
    const workspace = store.requireWorkspace(input.workspaceId);
    const targets = [
      ...new Set([
        ...(input.memberId ? [input.memberId] : []),
        ...input.memberIds,
        ...input.userSet,
      ]),
    ];
    if (!targets.length) targets.push(request.user.sub);
    for (const memberId of targets) {
      if (memberId !== request.user.sub &&
        (!canApproveRole(workspace, request.user.sub, input.role) ||
          !pendingRoles(workspace, memberId).includes(input.role)))
        throw new Error("권한이 없습니다");
      removePendingRole(workspace, memberId, input.role);
    }
    return ok("가입 신청 취소 성공");
  },
);
app.get(
  API_SPEC.workspaceWaitlist.path,
  { preHandler: auth },
  async (request) => {
    const input = query(workspaceWaitlistQuerySchema, request);
    const workspace = store.requireWorkspace(input.workspaceId);
    if (!canApproveRole(workspace, request.user.sub, input.role))
      throw new Error("권한이 없습니다");
    return ok(
      "가입 대기 목록 조회 성공",
      workspace.waitlist
        .filter(
          (id) =>
            pendingRoles(workspace, id).includes(input.role),
        )
        .map((id) => ({
          ...store.requireMember(id),
          role: input.role,
          permission: legacyRole(input.role),
        })),
    );
  },
);
app.patch(
  API_SPEC.updateWorkspace.path,
  { preHandler: auth },
  async (request) => {
    const input = body(updateWorkspaceSchema, request);
    const workspace = store.requireWorkspace(input.workspaceId);
    if (!canManageWorkspace(workspace, request.user.sub))
      throw new Error("권한이 없습니다");
    const name = input.name ?? input.workspaceName;
    const image =
      input.image ?? input.workspaceImageUrl ?? input.workspaceImgUrl;
    if (name !== undefined) workspace.name = name.trim();
    if (image) workspace.image = image;
    return ok("워크스페이스 수정 성공");
  },
);
app.get(
  API_SPEC.myWaitingWorkspaces.path,
  { preHandler: auth },
  async (request) =>
    ok(
      "내 가입 대기 목록 조회 성공",
      [...store.workspaces.values()]
        .filter(
          (workspace) =>
            workspace.status !== "DELETE" &&
            workspace.waitlist.includes(request.user.sub),
        )
        .map((workspace) => ({
          ...legacyWorkspace(workspace),
          requestedRoles: pendingRoles(workspace, request.user.sub).filter(
            (role): role is "STUDENT" | "TEACHER" =>
              role === "STUDENT" || role === "TEACHER",
          ),
        })),
    ),
);
app.get(
  API_SPEC.workspaceMemberChart.path,
  { preHandler: auth },
  async (request) => {
    const workspace = store.requireWorkspace(
      query(profileWorkspaceQuerySchema, request).workspaceId,
    );
    if (!workspace.members.includes(request.user.sub))
      throw new Error("권한이 없습니다");
    const chart = {
      admin: {} as Record<string, WorkspaceMemberChartProfile[]>,
      middleAdmin: {} as Record<string, WorkspaceMemberChartProfile[]>,
      teachers: {} as Record<string, WorkspaceMemberChartProfile[]>,
      students: {} as Record<string, WorkspaceMemberChartProfile[]>,
    };
    for (const memberId of workspace.members) {
      const member = store.requireMember(memberId);
      const profile = store.profiles.get(`${workspace.id}:${memberId}`);
      const role = roleIn(workspace, memberId) ?? "STUDENT";
      const belong = profile?.belong ?? "";
      if (!belong) continue;
      const item: WorkspaceMemberChartProfile = {
        workspaceId: workspace.id,
        member: {
          id: member.id,
          email: member.email,
          birth: member.birth ?? "",
          name: member.name,
          picture: member.picture,
        },
        permission: role,
        schGrade: profile?.grade ?? 0,
        schClass: profile?.class ?? 0,
        schNumber: profile?.number ?? 0,
        status: profile?.status ?? "",
        nick: profile?.nick ?? "",
        belong,
        spot: profile?.spot ?? "",
        phone: profile?.phone ?? "",
        wire: profile?.wire ?? "",
        location: profile?.location ?? "",
      };
      const section =
        role === "ADMIN"
          ? chart.admin
          : role === "MIDDLE_ADMIN"
            ? chart.middleAdmin
            : role === "TEACHER"
              ? chart.teachers
              : chart.students;
      (section[belong] ??= []).push(item);
    }
    return ok("조직도를 불러왔습니다", chart);
  },
);
app.get(
  API_SPEC.workspaceMembers.path,
  { preHandler: auth },
  async (request) => {
    const workspace = store.requireWorkspace(
      query(profileWorkspaceQuerySchema, request).workspaceId,
    );
    if (!workspace.members.includes(request.user.sub))
      throw new Error("권한이 없습니다");
    return ok(
      "구성원 목록 조회 성공",
      workspace.members.map((id) => legacyWorkspaceMember(workspace, id)),
    );
  },
);
app.patch(
  API_SPEC.updateWorkspaceMemberRole.path,
  { preHandler: auth },
  async (request) => {
    const input = body(updateWorkspaceMemberRoleSchema, request);
    const workspace = store.requireWorkspace(input.workspaceId);
    if (
      workspace.ownerId !== request.user.sub ||
      !workspace.members.includes(input.memberId)
    )
      throw new Error("권한이 없습니다");
    const member = store.requireMember(input.memberId);
    const previous = store.profiles.get(`${workspace.id}:${member.id}`);
    const role =
      (input.role ?? input.workspaceRole) === "MIDDLEADMIN"
        ? "MIDDLE_ADMIN"
        : (input.role ?? input.workspaceRole!);
    store.profiles.set(`${workspace.id}:${member.id}`, {
      ...member,
      workspaceId: workspace.id,
      ...previous,
      role,
    });
    return ok("권한 변경 성공");
  },
);
app.patch(
  API_SPEC.kickWorkspaceMembers.path,
  { preHandler: auth },
  async (request) => {
    const input = body(kickWorkspaceMembersSchema, request);
    const workspace = store.requireWorkspace(input.workspaceId);
    const memberIds = [
      ...new Set([
        ...(input.memberId ? [input.memberId] : []),
        ...(input.memberList ?? []),
      ]),
    ];
    const actorRole = roleIn(workspace, request.user.sub);
    if (
      !canManageWorkspace(workspace, request.user.sub) ||
      memberIds.some(
        (id) =>
          id === workspace.ownerId ||
          !workspace.members.includes(id) ||
          (roleIn(workspace, id) === "MIDDLE_ADMIN" && actorRole !== "ADMIN"),
      )
    )
      throw new Error("권한이 없습니다");
    for (const memberId of memberIds) {
      workspace.members = workspace.members.filter((id) => id !== memberId);
      workspace.waitlist = workspace.waitlist.filter((id) => id !== memberId);
      store.waitlistRoles.delete(`${workspace.id}:${memberId}`);
      store.profiles.delete(`${workspace.id}:${memberId}`);
      for (const room of store.rooms.values())
        if (
          room.workspaceId === workspace.id &&
          room.memberIds.includes(memberId)
        ) {
          room.memberIds = room.memberIds.filter((id) => id !== memberId);
          if (room.adminId === memberId)
            room.adminId = room.memberIds[0] ?? "";
        }
    }
    return ok("구성원 내보내기 성공");
  },
);

}
