import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { basename } from "node:path";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  API_SPEC,
  CHAT_EMOJIS,
  aiPromptSchema,
  authenticateOAuthSchema,
  chatEmojiSchema,
  chatMemberEventSchema,
  chatRoomSearchSchema,
  connectGoogleSchema,
  createChatRoomSchema,
  createNotificationSchema,
  createTaskSchema,
  createTimetableSchema,
  createWorkspaceSchema,
  deleteMessageSchema,
  editMemberSchema,
  editProfileSchema,
  editStudentNumberSchema,
  emailVerificationSchema,
  idParamSchema,
  joinWorkspaceSchema,
  kickWorkspaceMembersSchema,
  loginMemberSchema,
  logoutMemberSchema,
  mealDateQuerySchema,
  mealRangeQuerySchema,
  memberDeviceTokenSchema,
  messageHistoryQuerySchema,
  monthScheduleQuerySchema,
  timetableQuerySchema,
  notificationEmojiSchema,
  notificationPageQuerySchema,
  oauthProviderSchema,
  otherProfileQuerySchema,
  profileWorkspaceQuerySchema,
  registerMemberSchema,
  sendVerificationQuerySchema,
  tokenQuerySchema,
  updateNotificationSchema,
  updateTimetableSchema,
  updateWorkspaceMemberRoleSchema,
  updateWorkspaceSchema,
  uploadNameParamSchema,
  uploadTypeSchema,
  workspaceCodeParamSchema,
  workspaceIdParamSchema,
  workspaceNotificationsSchema,
  workspaceWaitlistActionSchema,
  workspaceWaitlistQuerySchema,
  type ApiResponse,
  type ChatMessage,
  type Notification,
  type Profile,
  type Role,
  type RoomType,
  type Timetable,
  type Workspace,
  type WorkspaceMemberChartProfile,
} from "@seugi/contracts";
import { Store } from "./store.js";
import { NeisClient } from "./neis.js";
import { OAuthProvider } from "./oauth.js";
import { sendVerificationEmail } from "./mailer.js";
import { fetchClassroomTasks } from "./classroom.js";
import { answerSchoolQuestion, answerWithCatseugi, schoolQuestionIntent } from "./ai.js";
import { PushNotifications } from "./push.js";
import { FileStorage } from "./storage.js";

type Claims = { sub: string };
declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: Claims;
  }
}
const ok = <T>(message: string, data?: T): ApiResponse<T> =>
  data === undefined ? { message } : { message, data };
const body = <T extends z.ZodTypeAny>(schema: T, request: FastifyRequest) =>
  schema.parse(request.body);
const query = <T extends z.ZodTypeAny>(schema: T, request: FastifyRequest) =>
  schema.parse(request.query);
const idParam = idParamSchema;
const workspaceParam = workspaceIdParamSchema;

export async function buildApp(store = new Store()): Promise<FastifyInstance> {
  const jwtSecret =
    process.env.JWT_SECRET ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : "development-only-change-me");
  if (!jwtSecret) throw new Error("JWT_SECRET_REQUIRED");
  const app = Fastify({
    logger: true,
    routerOptions: { ignoreTrailingSlash: true },
  });
  const auth = async (request: FastifyRequest) => {
    await request.jwtVerify<Claims>();
    store.requireMember(request.user.sub);
  };
  const uploadDirectory = process.env.UPLOAD_DIR ?? "./data/uploads";
  const storage = new FileStorage(uploadDirectory);
  const neis = new NeisClient();
  const oauth = new OAuthProvider();
  const push = new PushNotifications();
  await app.register(cors, { origin: true });
  await app.register(jwt, { secret: jwtSecret });
  const accessTokenTtl = process.env.JWT_ACCESS_TTL ?? "15m";
  const refreshTokenTtl = process.env.JWT_REFRESH_TTL ?? "30d";
  const issueTokens = (memberId: string) => ({
    accessToken: app.jwt.sign({ sub: memberId }, { expiresIn: accessTokenTtl }),
    refreshToken: app.jwt.sign(
      { sub: memberId },
      { expiresIn: refreshTokenTtl },
    ),
  });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  app.addHook("onRequest", async () => {
    await store.beginRequest();
  });
  app.addHook("onSend", async (_request, reply, payload) => {
    if (reply.statusCode >= 400) await store.rollbackRequest();
    else await store.persist();
    return payload;
  });
  app.setErrorHandler((error, _request, reply) => {
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "";
    const explicitStatus =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof error.statusCode === "number"
        ? error.statusCode
        : undefined;
    const status =
      explicitStatus ??
      (error instanceof z.ZodError
        ? 400
        : code === "FST_JWT_NO_AUTHORIZATION_IN_HEADER" ||
            code === "FST_JWT_AUTHORIZATION_TOKEN_INVALID"
          ? 401
          : message === "권한이 없습니다"
            ? 403
            : message.endsWith("NOT_FOUND")
              ? 404
              : message.startsWith("AI_")
                ? 503
                : 500);
    return reply.code(status).send({ message });
  });
  app.get(API_SPEC.health.path, async () => ok("healthy", { status: "ok" }));
  app.get(API_SPEC.uploadedFile.path, async (request, reply) => {
    const name = basename(uploadNameParamSchema.parse(request.params).name);
    try {
      return reply.send(await storage.read(name));
    } catch (error) {
      if (error instanceof Error && error.message === "FILE_NOT_FOUND")
        return reply.code(404).send({ message: "FILE_NOT_FOUND" });
      throw error;
    }
  });

  const rememberDeviceToken = (memberId: string, token?: string) => {
    if (token)
      store.deviceTokens.set(memberId, [
        ...new Set([...(store.deviceTokens.get(memberId) ?? []), token]),
      ]);
  };
  app.post(API_SPEC.registerMember.path, async (request, reply) => {
    const input = body(registerMemberSchema, request);
    const verification = store.emailCodes.get(input.email);
    if (
      !verification ||
      verification.expiresAt < Date.now() ||
      verification.code !== input.code
    )
      return reply
        .code(409)
        .send({ message: "이메일 인증 코드가 일치하지 않거나 만료되었습니다" });
    if (
      [...store.members.values()].some((member) => member.email === input.email)
    )
      return reply.code(409).send({ message: "이미 가입된 이메일입니다" });
    const member: {
      id: string;
      email: string;
      name: string;
      password: string;
      refreshToken?: string;
    } = {
      id: store.id(),
      email: input.email,
      name: input.name ?? input.email.split("@")[0],
      password: await bcrypt.hash(input.password, 12),
    };
    store.members.set(member.id, member);
    store.emailCodes.delete(input.email);
    const tokens = issueTokens(member.id);
    member.refreshToken = tokens.refreshToken;
    return ok("회원가입 성공", tokens);
  });
  app.post(API_SPEC.loginMember.path, async (request, reply) => {
    const input = body(loginMemberSchema, request);
    const candidate = [...store.members.values()].find(
      (item) => item.email === input.email && !item.deleted,
    );
    const member =
      candidate?.password &&
      (await bcrypt.compare(input.password, candidate.password))
        ? candidate
        : undefined;
    if (!member)
      return reply
        .code(401)
        .send({ message: "이메일 또는 비밀번호가 올바르지 않습니다" });
    const tokens = issueTokens(member.id);
    member.refreshToken = tokens.refreshToken;
    rememberDeviceToken(member.id, input.token);
    return ok("로그인 성공", tokens);
  });
  app.get(API_SPEC.refreshMember.path, async (request, reply) => {
    const token = query(tokenQuerySchema, request).token;
    try {
      const claims = app.jwt.verify<Claims>(token);
      const member = store.requireMember(claims.sub);
      if (member.refreshToken !== token) throw new Error();
      return ok(
        "토큰 재발급 성공",
        app.jwt.sign({ sub: member.id }, { expiresIn: accessTokenTtl }),
      );
    } catch {
      return reply
        .code(401)
        .send({ message: "유효하지 않은 리프레시 토큰입니다" });
    }
  });
  app.get(API_SPEC.memberInfo.path, { preHandler: auth }, async (request) => {
    const {
      password: _password,
      refreshToken: _refreshToken,
      ...member
    } = store.requireMember(request.user.sub);
    return ok("내 정보 조회 성공", member);
  });
  app.patch(API_SPEC.editMember.path, { preHandler: auth }, async (request) => {
    const input = body(editMemberSchema, request);
    Object.assign(store.requireMember(request.user.sub), input);
    return ok("회원 정보 수정 성공");
  });
  app.post(
    API_SPEC.addDeviceToken.path,
    { preHandler: auth },
    async (request) => {
      const token = body(memberDeviceTokenSchema, request).token;
      store.deviceTokens.set(request.user.sub, [
        ...new Set([
          ...(store.deviceTokens.get(request.user.sub) ?? []),
          token,
        ]),
      ]);
      return ok("기기 알림 토큰 등록 성공");
    },
  );
  app.delete(
    API_SPEC.removeDeviceToken.path,
    { preHandler: auth },
    async (request) => {
      const token = body(memberDeviceTokenSchema, request).token;
      store.deviceTokens.set(
        request.user.sub,
        (store.deviceTokens.get(request.user.sub) ?? []).filter(
          (value) => value !== token,
        ),
      );
      return ok("기기 알림 토큰 삭제 성공");
    },
  );
  app.post(
    API_SPEC.logoutMember.path,
    { preHandler: auth },
    async (request) => {
      const token = body(logoutMemberSchema, request);
      store.requireMember(request.user.sub).refreshToken = undefined;
      const deviceToken = token.deviceToken ?? token.fcmToken;
      if (deviceToken)
        store.deviceTokens.set(
          request.user.sub,
          (store.deviceTokens.get(request.user.sub) ?? []).filter(
            (value) => value !== deviceToken,
          ),
        );
      return ok("로그아웃 성공");
    },
  );
  app.delete(
    API_SPEC.removeMember.path,
    { preHandler: auth },
    async (request) => {
      const member = store.requireMember(request.user.sub);
      member.deleted = true;
      member.refreshToken = undefined;
      store.deviceTokens.delete(request.user.sub);
      return ok("회원 탈퇴 성공");
    },
  );

  const normalizeWorkspaceInput = (
    input: z.infer<typeof createWorkspaceSchema>,
  ) => ({
    name: input.name ?? input.workspaceName!,
    schoolCode: input.schoolCode,
    educationOfficeCode: input.educationOfficeCode,
    schoolType: input.schoolType,
    image:
      input.image ??
      (input.workspaceImageUrl || input.workspaceImgUrl || undefined),
  });
  const legacyWorkspace = (workspace: Workspace) => ({
    ...workspace,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    workspaceImageUrl: workspace.image ?? "",
    workspaceAdmin: workspace.ownerId,
    middleAdmin: workspace.members.filter(
      (id) =>
        id !== workspace.ownerId && roleIn(workspace, id) === "MIDDLE_ADMIN",
    ),
    teacher: workspace.members.filter(
      (id) => roleIn(workspace, id) === "TEACHER",
    ),
    student: workspace.members.filter(
      (id) => roleIn(workspace, id) === "STUDENT",
    ),
  });
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
  const workspacePushTokens = (
    workspace: { id: string },
    memberIds: string[],
    excludedMemberId?: string,
  ) => store.pushTokensForWorkspace(workspace.id, memberIds, excludedMemberId);
  const canApproveRole = (
    workspace: { id: string; ownerId: string },
    memberId: string,
    role: "STUDENT" | "TEACHER" | "MIDDLE_ADMIN",
  ) =>
    role === "STUDENT"
      ? roleIn(workspace, memberId) !== "STUDENT" &&
        !!roleIn(workspace, memberId)
      : role === "TEACHER"
        ? canManageWorkspace(workspace, memberId)
        : workspace.ownerId === memberId;
  app.post(
    API_SPEC.createWorkspace.path,
    { preHandler: auth },
    async (request) => {
      const input = normalizeWorkspaceInput(
        body(createWorkspaceSchema, request),
      );
      const workspace = {
        id: store.id(),
        code: store.id().slice(0, 8).toUpperCase(),
        ownerId: request.user.sub,
        members: [request.user.sub],
        waitlist: [],
        ...input,
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
      if (!workspace.members.includes(request.user.sub))
        throw new Error("권한이 없습니다");
      return ok("초대 코드 조회 성공", workspace.code);
    },
  );
  app.get(
    API_SPEC.searchWorkspace.path,
    { preHandler: auth },
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
      if (
        !workspace.members.includes(request.user.sub) &&
        !workspace.waitlist.includes(request.user.sub)
      )
        workspace.waitlist.push(request.user.sub);
      store.waitlistRoles.set(
        `${workspace.id}:${request.user.sub}`,
        input.role,
      );
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
        if (
          store.waitlistRoles.get(`${workspace.id}:${memberId}`) !==
            input.role &&
          workspace.waitlist.includes(memberId)
        )
          continue;
        workspace.waitlist = workspace.waitlist.filter((id) => id !== memberId);
        store.waitlistRoles.delete(`${workspace.id}:${memberId}`);
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
        if (
          memberId !== request.user.sub &&
          (!canApproveRole(workspace, request.user.sub, input.role) ||
            store.waitlistRoles.get(`${workspace.id}:${memberId}`) !==
              input.role)
        )
          throw new Error("권한이 없습니다");
        workspace.waitlist = workspace.waitlist.filter((id) => id !== memberId);
        store.waitlistRoles.delete(`${workspace.id}:${memberId}`);
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
              (store.waitlistRoles.get(`${workspace.id}:${id}`) ??
                "STUDENT") === input.role,
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
          .map(legacyWorkspace),
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
      if (
        workspace.ownerId !== request.user.sub ||
        memberIds.some(
          (id) => id === workspace.ownerId || !workspace.members.includes(id),
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
      if (
        !workspace.members.includes(request.user.sub) ||
        !workspace.members.includes(memberId) ||
        (memberId !== request.user.sub &&
          !canManageWorkspace(workspace, request.user.sub))
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

  const legacyRoom = (
    room: {
      id: string;
      workspaceId: string;
      type: RoomType;
      name: string;
      memberIds: string[];
      adminId: string;
      image?: string;
      status?: "ALIVE" | "DELETE";
      createdAt?: string;
      memberReadAt?: Record<string, string>;
    },
    memberId: string,
  ) => {
    const roomMessages = [...store.messages.values()]
      .filter((message) => message.roomId === room.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const lastMessage = roomMessages.at(-1);
    const readAt =
      room.memberReadAt?.[memberId] ??
      room.createdAt ??
      new Date(0).toISOString();
    return {
      ...room,
      roomAdmin: room.adminId,
      chatName: room.name,
      chatRoomImg: room.image ?? "",
      createdAt: room.createdAt ?? new Date(0).toISOString(),
      chatStatusEnum: room.status === "DELETE" ? "DELETE" : "ACTIVE",
      joinUserInfo: room.memberIds.map((id) => {
        const member = store.requireMember(id);
        return {
          userInfo: {
            id,
            email: member.email,
            birth: member.birth ?? "",
            name: member.name,
            picture: member.picture ?? "",
          },
          timestamp:
            room.memberReadAt?.[id] ??
            room.createdAt ??
            new Date(0).toISOString(),
        };
      }),
      lastMessage:
        lastMessage &&
        lastMessage.messageStatus !== "DELETE" &&
        (!lastMessage.type || lastMessage.type === "MESSAGE")
          ? lastMessage.message
          : "",
      lastMessageTimestamp: lastMessage?.createdAt ?? new Date().toISOString(),
      notReadCnt: roomMessages.filter(
        (message) =>
          message.type !== "BOT" &&
          message.messageStatus !== "DELETE" &&
          message.createdAt > readAt,
      ).length,
    };
  };
  const createRoom = (type: RoomType) => async (request: FastifyRequest) => {
    const input = body(createChatRoomSchema, request);
    if (!store.canAccess(input.workspaceId, request.user.sub))
      throw new Error("권한이 없습니다");
    const workspace = store.requireWorkspace(input.workspaceId);
    const requestedMemberIds = input.memberIds ?? input.joinUsers!;
    if (
      requestedMemberIds.some((id: string) => !workspace.members.includes(id))
    )
      throw new Error("권한이 없습니다");
    const memberIds = [...new Set([request.user.sub, ...requestedMemberIds])];
    if (type === "PERSONAL" && memberIds.length !== 2)
      throw Object.assign(
        new Error("개인 채팅은 참여자가 두 명이어야 합니다"),
        { statusCode: 400 },
      );
    if (type === "PERSONAL") {
      const existing = [...store.rooms.values()].find(
        (room) =>
          room.status !== "DELETE" &&
          room.type === type &&
          room.workspaceId === input.workspaceId &&
          room.memberIds.length === memberIds.length &&
          room.memberIds.every((id) => memberIds.includes(id)),
      );
      if (existing) return ok("채팅방 생성 성공", existing.id);
    }
    const rawName = input.name ?? input.roomName ?? "";
    const counterpartName =
      type === "PERSONAL"
        ? store.requireMember(memberIds.find((id) => id !== request.user.sub)!)
            .name
        : memberIds
            .map((id) => store.requireMember(id).name)
            .join(", ")
            .slice(0, 80);
    const createdAt = new Date().toISOString();
    const room = {
      id: store.id(),
      type,
      workspaceId: input.workspaceId,
      name: rawName || counterpartName,
      image: input.image ?? input.chatRoomImg ?? undefined,
      memberIds,
      adminId: request.user.sub,
      createdAt,
      memberReadAt: Object.fromEntries(memberIds.map((id) => [id, createdAt])),
    };
    store.rooms.set(room.id, room);
    return ok("채팅방 생성 성공", room.id);
  };
  for (const [path, type] of [
    [API_SPEC.createGroupRoom.path, "GROUP"],
    [API_SPEC.createPersonalRoom.path, "PERSONAL"],
  ] as const)
    app.post(path, { preHandler: auth }, createRoom(type));
  for (const [prefix, type] of [
    ["/chat/group", "GROUP"],
    ["/chat/personal", "PERSONAL"],
  ] as const) {
    app.get(
      type === "GROUP" ? API_SPEC.groupRooms.path : API_SPEC.personalRooms.path,
      { preHandler: auth },
      async (request) => {
        const workspaceId = workspaceParam.parse(request.params).workspaceId;
        const rooms = [...store.rooms.values()].filter(
          (room) =>
            room.status !== "DELETE" &&
            room.workspaceId === workspaceId &&
            room.type === type &&
            room.memberIds.includes(request.user.sub),
        );
        return ok(
          "채팅방 목록 조회 성공",
          rooms.map((room) => legacyRoom(room, request.user.sub)),
        );
      },
    );
    app.get(
      type === "GROUP" ? API_SPEC.groupRoom.path : API_SPEC.personalRoom.path,
      { preHandler: auth },
      async (request) => {
        const roomId = z
          .object({ roomId: z.string().uuid() })
          .parse(request.params).roomId;
        const room = store.rooms.get(roomId);
        if (
          !room ||
          room.status === "DELETE" ||
          room.type !== type ||
          !room.memberIds.includes(request.user.sub)
        )
          throw new Error("ROOM_NOT_FOUND");
        return ok("채팅방 조회 성공", legacyRoom(room, request.user.sub));
      },
    );
    app.get(
      type === "GROUP"
        ? API_SPEC.searchGroupRooms.path
        : API_SPEC.searchPersonalRooms.path,
      { preHandler: auth },
      async (request) => {
        const input = query(chatRoomSearchSchema, request);
        return ok(
          "채팅방 검색 성공",
          [...store.rooms.values()]
            .filter(
              (room) =>
                room.status !== "DELETE" &&
                room.workspaceId === input.workspace &&
                room.type === type &&
                room.memberIds.includes(request.user.sub) &&
                room.name.includes(input.word),
            )
            .map((room) => legacyRoom(room, request.user.sub)),
        );
      },
    );
  }
  app.patch(
    API_SPEC.leaveGroupRoom.path,
    { preHandler: auth },
    async (request) => {
      const room = store.rooms.get(
        z.object({ roomId: z.string().uuid() }).parse(request.params).roomId,
      );
      if (
        !room ||
        room.status === "DELETE" ||
        !room.memberIds.includes(request.user.sub)
      )
        throw new Error("ROOM_NOT_FOUND");
      if (room.type !== "GROUP")
        throw Object.assign(new Error("CHAT_TYPE_ERROR"), { statusCode: 400 });
      if (room.adminId === request.user.sub && room.memberIds.length !== 1)
        throw Object.assign(new Error("CHAT_LEFT_ERROR"), { statusCode: 400 });
      room.memberIds = room.memberIds.filter((id) => id !== request.user.sub);
      if (room.memberReadAt) delete room.memberReadAt[request.user.sub];
      if (room.memberIds.length === 0) room.status = "DELETE";
      return ok("채팅방 나가기 성공");
    },
  );
  app.post(
    API_SPEC.addGroupMembers.path,
    { preHandler: auth },
    async (request) => {
      const input = body(chatMemberEventSchema, request);
      const room = store.rooms.get(input.roomId);
      if (
        !room ||
        room.type !== "GROUP" ||
        !room.memberIds.includes(request.user.sub)
      )
        throw new Error("권한이 없습니다");
      const workspace = store.requireWorkspace(room.workspaceId);
      if (input.memberIds.some((id: string) => !workspace.members.includes(id)))
        throw new Error("권한이 없습니다");
      const addedAt = new Date().toISOString();
      const newMembers = input.memberIds.filter(
        (id: string) => !room.memberIds.includes(id),
      );
      room.memberIds = [...new Set([...room.memberIds, ...input.memberIds])];
      room.memberReadAt ??= {};
      for (const id of newMembers) room.memberReadAt[id] = addedAt;
      return ok("참여자 추가 성공");
    },
  );
  app.patch(
    API_SPEC.removeGroupMembers.path,
    { preHandler: auth },
    async (request) => {
      const input = body(chatMemberEventSchema, request);
      const room = store.rooms.get(input.roomId);
      if (
        !room ||
        room.type !== "GROUP" ||
        room.adminId !== request.user.sub ||
        input.memberIds.includes(room.adminId) ||
        input.memberIds.some((id: string) => !room.memberIds.includes(id))
      )
        throw new Error("권한이 없습니다");
      room.memberIds = room.memberIds.filter(
        (id: string) => !input.memberIds.includes(id),
      );
      if (room.memberReadAt)
        for (const id of input.memberIds) delete room.memberReadAt[id];
      return ok("참여자 추방 성공");
    },
  );
  app.patch(
    API_SPEC.transferGroupAdmin.path,
    { preHandler: auth },
    async (request) => {
      const input = body(chatMemberEventSchema, request);
      const room = store.rooms.get(input.roomId);
      const nextAdmin = input.memberId ?? input.memberIds[0];
      if (
        !room ||
        room.type !== "GROUP" ||
        room.adminId !== request.user.sub ||
        !nextAdmin ||
        !room.memberIds.includes(nextAdmin)
      )
        throw new Error("권한이 없습니다");
      room.adminId = nextAdmin;
      return ok("방장 위임 성공");
    },
  );
  const legacyMessage = (message: ChatMessage): ChatMessage => {
    const type =
      message.type === "BOT"
        ? "BOT"
        : message.type === "IMG" || message.type === "FILE"
          ? message.type
        : message.files?.length
          ? /\.(?:png|jpe?g|gif|webp|heic|bmp)(?:[?#]|$)/i.test(
              message.files[0],
            )
            ? "IMG"
            : "FILE"
          : "MESSAGE";
    return {
      ...message,
      message: message.message || (message.files?.[0] ?? ""),
      chatRoomId: message.roomId,
      type,
      userId: message.senderId === "-1" ? -1 : message.senderId,
      uuid: message.id,
      eventList: [],
      emoticon: null,
      emojiList: CHAT_EMOJIS.flatMap((emoji, index) => {
        const userIds = message.emojis[emoji] ?? [];
        return userIds.length ? [{ emojiId: index + 1, userId: userIds }] : [];
      }),
      mention: message.mention ?? [],
      mentionAll: message.mentionAll ?? false,
      timestamp: message.createdAt,
      messageStatus: message.messageStatus ?? "ALIVE",
    };
  };
  app.get(API_SPEC.messages.path, { preHandler: auth }, async (request) => {
    const roomId = z
      .object({ roomId: z.string().uuid() })
      .parse(request.params).roomId;
    const room = store.rooms.get(roomId);
    if (!room?.memberIds.includes(request.user.sub))
      throw new Error("ROOM_NOT_FOUND");
    const timestamp = query(messageHistoryQuerySchema, request).timestamp;
    const messages = [...store.messages.values()]
      .filter(
        (item) =>
          item.roomId === roomId && (!timestamp || item.createdAt < timestamp),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50);
    return ok("메시지 조회 성공", {
      messages: messages.map(legacyMessage),
      firstMessageId: messages.at(-1)?.id ?? null,
      hasNext: messages.length === 50,
    });
  });
  app.put(
    API_SPEC.addMessageEmoji.path,
    { preHandler: auth },
    async (request) => {
      const input = body(chatEmojiSchema, request);
      const message = store.messages.get(input.messageId);
      if (!message || message.messageStatus === "DELETE")
        throw new Error("MESSAGE_NOT_FOUND");
      const room = store.rooms.get(message.roomId);
      if (!room?.memberIds.includes(request.user.sub))
        throw new Error("권한이 없습니다");
      const users = message.emojis[input.emoji] ?? [];
      if (!users.includes(request.user.sub)) {
        message.emojis[input.emoji] = [...users, request.user.sub];
        store.queueMessageEmoji({
          roomId: room.id,
          messageId: message.id,
          senderId: request.user.sub,
          emoji: input.emoji,
          action: "ADD",
        });
      }
      return ok("이모지 추가 성공");
    },
  );
  app.delete(
    API_SPEC.removeMessageEmoji.path,
    { preHandler: auth },
    async (request) => {
      const input = body(chatEmojiSchema, request);
      const message = store.messages.get(input.messageId);
      if (!message || message.messageStatus === "DELETE")
        throw new Error("MESSAGE_NOT_FOUND");
      const room = store.rooms.get(message.roomId);
      if (!room?.memberIds.includes(request.user.sub))
        throw new Error("권한이 없습니다");
      const users = message.emojis[input.emoji] ?? [];
      if (users.includes(request.user.sub)) {
        message.emojis[input.emoji] = users.filter(
          (id) => id !== request.user.sub,
        );
        store.queueMessageEmoji({
          roomId: room.id,
          messageId: message.id,
          senderId: request.user.sub,
          emoji: input.emoji,
          action: "REMOVE",
        });
      }
      return ok("이모지 삭제 성공");
    },
  );
  app.delete(
    API_SPEC.deleteMessage.path,
    { preHandler: auth },
    async (request) => {
      const input = body(deleteMessageSchema, request);
      const message = store.messages.get(input.messageId);
      const room = store.rooms.get(input.roomId);
      if (
        !message ||
        message.roomId !== input.roomId ||
        message.senderId !== request.user.sub ||
        !room?.memberIds.includes(request.user.sub)
      )
        throw new Error("MESSAGE_NOT_FOUND");
      if (message.messageStatus !== "DELETE") {
        store.messages.set(message.id, {
          ...message,
          message: "",
          files: undefined,
          messageStatus: "DELETE",
        });
        store.queueMessageDeleted({
          roomId: room.id,
          messageId: message.id,
          senderId: request.user.sub,
        });
      }
      return ok("메시지 삭제 성공");
    },
  );

  const legacyNotification = (item: Notification) => ({
    ...item,
    userId: item.authorId,
    userName: store.requireMember(item.authorId).name,
    emoji: Object.entries(item.emojis)
      .filter(([, userList]) => userList.length > 0)
      .map(([emoji, userList]) => ({ emoji, userList })),
    createdDate: item.createdAt,
    lastModifiedDate: item.updatedAt ?? item.createdAt,
  });
  app.post(
    API_SPEC.createNotification.path,
    { preHandler: auth },
    async (request) => {
      const input = body(createNotificationSchema, request);
      const workspace = store.requireWorkspace(input.workspaceId);
      const role = roleIn(workspace, request.user.sub);
      if (!role || role === "STUDENT") throw new Error("권한이 없습니다");
      const createdAt = new Date().toISOString();
      const notification: Notification = {
        id: store.id(),
        ...input,
        authorId: request.user.sub,
        createdAt,
        updatedAt: createdAt,
        emojis: {},
      };
      store.notifications.set(notification.id, notification);
      const tokens = workspacePushTokens(
        workspace,
        workspace.members,
        request.user.sub,
      );
      void push
        .send(tokens, {
          title: `[공지] ${workspace.name}`,
          body: `${store.requireMember(request.user.sub).name}: ${input.content}`,
          imageUrl: workspace.image,
        })
        .catch((error) => app.log.error(error, "FCM notice push failed"));
      return ok("공지 생성 성공", legacyNotification(notification));
    },
  );
  app.get(
    API_SPEC.listNotifications.path,
    { preHandler: auth },
    async (request) => {
      const workspaceId = workspaceParam.parse(request.params).workspaceId;
      if (!store.canAccess(workspaceId, request.user.sub))
        throw new Error("권한이 없습니다");
      const { page, size } = query(notificationPageQuerySchema, request);
      return ok(
        "공지 조회 성공",
        [...store.notifications.values()]
          .filter((item) => item.workspaceId === workspaceId)
          .sort(
            (a, b) =>
              b.createdAt.localeCompare(a.createdAt) ||
              b.id.localeCompare(a.id),
          )
          .slice(page * size, (page + 1) * size)
          .map(legacyNotification),
      );
    },
  );
  app.patch(
    API_SPEC.updateNotification.path,
    { preHandler: auth },
    async (request) => {
      const input = body(updateNotificationSchema, request);
      const item = store.notifications.get(input.id);
      if (!item || item.authorId !== request.user.sub)
        throw new Error("NOTIFICATION_NOT_FOUND");
      item.title = input.title;
      item.content = input.content;
      item.updatedAt = new Date().toISOString();
      return ok("공지 수정 성공");
    },
  );
  app.delete(
    API_SPEC.deleteNotification.path,
    { preHandler: auth },
    async (request) => {
      const input = z
        .object({ workspaceId: z.string().uuid(), id: z.string().uuid() })
        .parse(request.params);
      const item = store.notifications.get(input.id);
      const workspace = store.requireWorkspace(input.workspaceId);
      if (
        !item ||
        item.workspaceId !== workspace.id ||
        (item.authorId !== request.user.sub &&
          !canManageWorkspace(workspace, request.user.sub))
      )
        throw new Error("NOTIFICATION_NOT_FOUND");
      store.notifications.delete(item.id);
      return ok("공지 삭제 성공");
    },
  );
  app.patch(
    API_SPEC.toggleNotificationEmoji.path,
    { preHandler: auth },
    async (request) => {
      const input = body(notificationEmojiSchema, request);
      const item = store.notifications.get(input.notificationId);
      if (!item) throw new Error("NOTIFICATION_NOT_FOUND");
      if (!store.canAccess(item.workspaceId, request.user.sub))
        throw new Error("권한이 없습니다");
      const people = item.emojis[input.emoji] ?? [];
      item.emojis[input.emoji] = people.includes(request.user.sub)
        ? people.filter((id) => id !== request.user.sub)
        : [...people, request.user.sub];
      return ok("성공");
    },
  );

  const localDateString = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const weekRange = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return [localDateString(start), localDateString(end)] as const;
  };
  const resetTimetable = async (workspaceId: string) => {
    const workspace = store.requireWorkspace(workspaceId);
    const [fromDate, toDate] = weekRange();
    const from = fromDate.replaceAll("-", "");
    const to = toDate.replaceAll("-", "");
    const rows = await neis.timetables(workspace, from, to);
    for (const [id, entry] of store.timetables)
      if (entry.workspaceId === workspaceId) store.timetables.delete(id);
    for (const entry of rows) {
      const id = store.id();
      store.timetables.set(id, { ...entry, id });
    }
  };
  const timetableForMember = async (
    workspaceId: string,
    memberId: string,
    weekly: boolean,
    targetClass?: { grade: string; classNum: string },
  ) => {
    if (!store.canAccess(workspaceId, memberId))
      throw new Error("권한이 없습니다");
    let rows = [...store.timetables.values()].filter(
      (entry) => entry.workspaceId === workspaceId,
    );
    if (!rows.length && process.env.NEIS_API_KEY) {
      await resetTimetable(workspaceId);
      rows = [...store.timetables.values()].filter(
        (entry) => entry.workspaceId === workspaceId,
      );
    }
    if (targetClass) {
      const role = roleIn(store.requireWorkspace(workspaceId), memberId);
      if (!["ADMIN", "MIDDLE_ADMIN", "TEACHER"].includes(role ?? ""))
        throw new Error("권한이 없습니다");
      rows = rows.filter((entry) => entry.grade === targetClass.grade && entry.classNum === targetClass.classNum);
    } else {
      const profile = store.profiles.get(`${workspaceId}:${memberId}`);
      if (!profile?.grade || !profile.class) return [];
      rows = rows.filter((entry) => entry.grade === String(profile.grade) && entry.classNum === String(profile.class));
    }
    if (!weekly) {
      const today = localDateString(new Date());
      return rows
        .filter((entry) => entry.date === today)
        .sort((a, b) => Number(a.time) - Number(b.time));
    }
    const [from, to] = weekRange();
    return rows
      .filter((entry) => entry.date >= from && entry.date <= to)
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) || Number(a.time) - Number(b.time),
      );
  };
  app.post(
    API_SPEC.createTimetable.path,
    { preHandler: auth },
    async (request) => {
      const input = body(createTimetableSchema, request);
      const workspace = store.requireWorkspace(input.workspaceId);
      if (
        !workspace.members.includes(request.user.sub) ||
        !["ADMIN", "MIDDLE_ADMIN", "TEACHER"].includes(
          roleIn(workspace, request.user.sub) ?? "",
        )
      )
        throw new Error("권한이 없습니다");
      const entry: Timetable = { id: store.id(), ...input };
      store.timetables.set(entry.id, entry);
      return ok("시간표 저장 성공!");
    },
  );
  app.patch(
    API_SPEC.updateTimetable.path,
    { preHandler: auth },
    async (request) => {
      const input = body(updateTimetableSchema, request);
      const entry = store.timetables.get(input.id);
      if (!entry) throw new Error("TIMETABLE_NOT_FOUND");
      const workspace = store.requireWorkspace(entry.workspaceId);
      if (
        !workspace.members.includes(request.user.sub) ||
        !["ADMIN", "MIDDLE_ADMIN", "TEACHER"].includes(
          roleIn(workspace, request.user.sub) ?? "",
        )
      )
        throw new Error("권한이 없습니다");
      entry.subject = input.subject;
      return ok("시간표 수정 성공!");
    },
  );
  app.delete(
    API_SPEC.deleteTimetable.path,
    { preHandler: auth },
    async (request) => {
      const entry = store.timetables.get(idParam.parse(request.params).id);
      if (!entry) throw new Error("TIMETABLE_NOT_FOUND");
      const workspace = store.requireWorkspace(entry.workspaceId);
      if (
        !workspace.members.includes(request.user.sub) ||
        !["ADMIN", "MIDDLE_ADMIN", "TEACHER"].includes(
          roleIn(workspace, request.user.sub) ?? "",
        )
      )
        throw new Error("권한이 없습니다");
      store.timetables.delete(entry.id);
      return ok("시간표 삭제 성공");
    },
  );
  app.post(
    API_SPEC.resetTimetable.path,
    { preHandler: auth },
    async (request) => {
      const workspaceId = query(
        profileWorkspaceQuerySchema,
        request,
      ).workspaceId;
      if (!store.canAccess(workspaceId, request.user.sub))
        throw new Error("권한이 없습니다");
      await resetTimetable(workspaceId);
      return ok("시간표 재설정 완료");
    },
  );
  app.get(
    API_SPEC.weeklyTimetable.path,
    { preHandler: auth },
    async (request) => {
      const input = query(timetableQuerySchema, request);
      const workspaceId = input.workspaceId;
      return ok(
        "시간표 조회 성공",
        await timetableForMember(workspaceId, request.user.sub, true, input.grade && input.classNum ? { grade: input.grade, classNum: input.classNum } : undefined),
      );
    },
  );
  app.get(
    API_SPEC.dailyTimetable.path,
    { preHandler: auth },
    async (request) => {
      const workspaceId = query(
        profileWorkspaceQuerySchema,
        request,
      ).workspaceId;
      return ok(
        "시간표 조회 성공",
        await timetableForMember(workspaceId, request.user.sub, false),
      );
    },
  );

  app.post(API_SPEC.createTask.path, { preHandler: auth }, async (request) => {
    const input = body(createTaskSchema, request);
    if (!store.canAccess(input.workspaceId, request.user.sub))
      throw new Error("권한이 없습니다");
    const id = store.id();
    const description = input.description ?? input.content;
    store.tasks.set(id, {
      id,
      workspaceId: input.workspaceId,
      title: input.title,
      description,
      content: description,
      dueDate: input.dueDate,
      createdAt: new Date().toISOString(),
    });
    return ok("과제 만들기 성공 !");
  });
  app.get(API_SPEC.listTasks.path, { preHandler: auth }, async (request) => {
    const workspaceId = workspaceParam.parse(request.params).workspaceId;
    if (!store.canAccess(workspaceId, request.user.sub))
      throw new Error("권한이 없습니다");
    return ok(
      "과제 불러오기 성공 !",
      [...store.tasks.values()]
        .filter((item) => item.workspaceId === workspaceId)
        .map((item) => ({
          ...item,
          description: item.description ?? item.content,
          content: item.content ?? item.description,
        })),
    );
  });
  app.get(
    API_SPEC.classroomTasks.path,
    { preHandler: auth },
    async (request) => {
      const connection = store.oauth.get(`${request.user.sub}:google`);
      if (!connection || connection.provider !== "google")
        throw new Error("GOOGLE_CONNECTION_NOT_FOUND");
      try {
        return ok(
          "클래스룸 과제 불러오기 성공 !",
          await fetchClassroomTasks(connection),
        );
      } catch (error) {
        if (
          !(error instanceof Error) ||
          error.message !== "GOOGLE_CLASSROOM_401" ||
          !connection.refreshToken
        )
          throw error;
        connection.accessToken = await oauth.refreshGoogle(
          connection.refreshToken,
        );
        return ok(
          "클래스룸 과제 불러오기 성공 !",
          await fetchClassroomTasks(connection),
        );
      }
    },
  );
  const mealsForMonth = async (
    workspaceId: string,
    year: number,
    month: number,
  ) => {
    const workspace = store.requireWorkspace(workspaceId);
    const from = `${year}${String(month).padStart(2, "0")}01`;
    const to = `${year}${String(month).padStart(2, "0")}${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
    return neis.meals(workspace, from, to);
  };
  const resetMeals = async (workspaceId: string) => {
    const today = new Date();
    const meals = await mealsForMonth(
      workspaceId,
      today.getFullYear(),
      today.getMonth() + 1,
    );
    store.meals.set(workspaceId, meals);
    return meals;
  };
  app.get(API_SPEC.mealForDate.path, { preHandler: auth }, async (request) => {
    const { workspaceId, date } = query(mealDateQuerySchema, request);
    if (!store.canAccess(workspaceId, request.user.sub))
      throw new Error("권한이 없습니다");
    const meals =
      store.meals.get(workspaceId) ?? (await resetMeals(workspaceId));
    return ok(
      "날짜로 급식 조회 성공",
      meals.filter((meal) => meal.date === date),
    );
  });
  app.get(API_SPEC.meals.path, { preHandler: auth }, async (request) => {
    const input = query(mealRangeQuerySchema, request);
    if (!store.canAccess(input.workspaceId, request.user.sub))
      throw new Error("권한이 없습니다");
    if (input.year !== undefined && input.month !== undefined) {
      const now = new Date();
      if (
        input.year === now.getFullYear() &&
        input.month === now.getMonth() + 1
      )
        return ok(
          "모든 급식 조회 성공",
          store.meals.get(input.workspaceId) ??
            (await resetMeals(input.workspaceId)),
        );
      return ok(
        "모든 급식 조회 성공",
        await mealsForMonth(input.workspaceId, input.year, input.month),
      );
    }
    return ok(
      "모든 급식 조회 성공",
      store.meals.get(input.workspaceId) ??
        (await resetMeals(input.workspaceId)),
    );
  });
  app.post(API_SPEC.resetMeals.path, { preHandler: auth }, async (request) => {
    const workspaceId = workspaceParam.parse(request.params).workspaceId;
    if (!store.canAccess(workspaceId, request.user.sub))
      throw new Error("권한이 없습니다");
    await resetMeals(workspaceId);
    return ok("급식 저장 성공");
  });
  const resetSchedules = async (workspaceId: string) => {
    const schedules = await neis.schedules(
      store.requireWorkspace(workspaceId),
      new Date().getFullYear(),
    );
    store.schedules = [
      ...store.schedules.filter((item) => item.workspaceId !== workspaceId),
      ...schedules,
    ];
    return schedules;
  };
  app.get(API_SPEC.schedules.path, { preHandler: auth }, async (request) => {
    const workspaceId = workspaceParam.parse(request.params).workspaceId;
    if (!store.canAccess(workspaceId, request.user.sub))
      throw new Error("권한이 없습니다");
    const schedules = store.schedules.filter(
      (item) => item.workspaceId === workspaceId,
    );
    return ok(
      "학사일정 전부 불러오기 성공",
      schedules.length ? schedules : await resetSchedules(workspaceId),
    );
  });
  app.get(
    API_SPEC.monthSchedules.path,
    { preHandler: auth },
    async (request) => {
      const input = query(monthScheduleQuerySchema, request);
      if (!store.canAccess(input.workspaceId, request.user.sub))
        throw new Error("권한이 없습니다");
      const all = store.schedules.filter(
        (item) => item.workspaceId === input.workspaceId,
      );
      const schedules = all.length
        ? all
        : await resetSchedules(input.workspaceId);
      return ok(
        "학사일정 한달치 불러오기 성공",
        schedules.filter(
          (item) => new Date(item.date).getMonth() + 1 === input.month,
        ),
      );
    },
  );
  app.get(API_SPEC.sendVerification.path, async (request) => {
    const email = query(sendVerificationQuerySchema, request).email;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    store.emailCodes.set(email, {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    await sendVerificationEmail(email, code);
    return ok("이메일 인증 코드 발송 성공");
  });
  app.post(API_SPEC.confirmVerification.path, async (request, reply) => {
    const input = body(emailVerificationSchema, request);
    const verification = store.emailCodes.get(input.email);
    if (
      !verification ||
      verification.expiresAt < Date.now() ||
      verification.code !== input.code
    )
      return reply
        .code(409)
        .send({ message: "코드가 일치하지 않거나 만료되었습니다" });
    return ok("이메일 인증 성공");
  });
  app.post(API_SPEC.authenticateOAuth.path, async (request, reply) => {
    const provider = oauthProviderSchema.parse(request.params).provider;
    const input = body(authenticateOAuthSchema, request);
    const identity =
      provider === "google"
        ? await oauth.google(input.code, input.platform)
        : await oauth.apple(input.code, input.platform, input.name);
    let member = [...store.members.values()].find(
      (item) => item.email === identity.email,
    );
    if (!member) {
      member = {
        id: store.id(),
        email: identity.email,
        name: identity.name,
        password: undefined,
      };
      store.members.set(member.id, member);
    }
    rememberDeviceToken(member.id, input.token);
    store.oauth.set(`${member.id}:${provider}`, {
      provider,
      accessToken: identity.accessToken,
      refreshToken: identity.refreshToken,
    });
    const tokens = issueTokens(member.id);
    member.refreshToken = tokens.refreshToken;
    return reply.send(ok("소셜 로그인 성공", tokens));
  });
  app.post(
    API_SPEC.connectGoogle.path,
    { preHandler: auth },
    async (request) => {
      const input = body(connectGoogleSchema, request);
      const identity = await oauth.google(input.code, input.platform);
      rememberDeviceToken(request.user.sub, input.token);
      store.oauth.set(`${request.user.sub}:google`, {
        provider: "google",
        accessToken: identity.accessToken,
        refreshToken: identity.refreshToken,
      });
      return ok("구글 연동 성공");
    },
  );
  app.delete(
    API_SPEC.removeGoogleConnection.path,
    { preHandler: auth },
    async (request) => {
      store.oauth.delete(`${request.user.sub}:google`);
      return ok("삭제 성공 !");
    },
  );
  app.get(
    API_SPEC.googleConnection.path,
    { preHandler: auth },
    async (request) =>
      ok(
        "구글 연동 상태 조회 성공",
        store.oauth.has(`${request.user.sub}:google`),
      ),
  );
  app.post(API_SPEC.askCatseugi.path, { preHandler: auth }, async (request) => {
    const input = body(aiPromptSchema, request);
    if (!input.workspaceId) return ok("캣스기답변", await answerWithCatseugi(input.message));
    if (!store.canAccess(input.workspaceId, request.user.sub))
      throw new Error("권한이 없습니다");
    const intent = schoolQuestionIntent(input.message);
    const needsMeals = intent === "MEAL";
    const needsTimetable = intent === "TIMETABLE";
    const needsMembers = intent === "PICK_MEMBER" || intent === "MAKE_TEAMS";
    const today = localDateString(new Date());
    let meals = store.meals.get(input.workspaceId) ?? [];
    if (needsMeals && !store.meals.has(input.workspaceId)) {
      try { meals = await resetMeals(input.workspaceId); } catch { meals = []; }
    }
    const timetable = needsTimetable ? await timetableForMember(input.workspaceId, request.user.sub, false) : [];
    const notifications = [...store.notifications.values()]
      .filter((item) => item.workspaceId === input.workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    let members: ReturnType<typeof store.requireMember>[] = [];
    if (needsMembers) {
      const workspace = store.requireWorkspace(input.workspaceId);
      const profile = store.profiles.get(`${workspace.id}:${request.user.sub}`);
      const requestedClass = input.message.match(/(\d+)\s*학년\s*(\d+)\s*반/);
      const grade = requestedClass?.[1] ?? (profile?.grade ? String(profile.grade) : undefined);
      const classNum = requestedClass?.[2] ?? (profile?.class ? String(profile.class) : undefined);
      members = workspace.members
        .filter((memberId) => roleIn(workspace, memberId) === "STUDENT")
        .filter((memberId) => {
          const studentProfile = store.profiles.get(`${workspace.id}:${memberId}`);
          return (!grade || studentProfile?.grade === Number(grade)) && (!classNum || studentProfile?.class === Number(classNum));
        })
        .map((memberId) => store.requireMember(memberId));
    }
    const schoolAnswer = answerSchoolQuestion(input.message, {
      meals: meals.filter((item) => item.date.slice(0, 10) === today),
      timetable,
      notifications,
      members,
    });
    return ok("캣스기답변", schoolAnswer ?? await answerWithCatseugi(input.message));
  });
  app.post(API_SPEC.uploadFile.path, { preHandler: auth }, async (request) => {
    const file = await request.file();
    if (!file) throw new Error("FILE_REQUIRED");
    const requestedType = uploadTypeSchema.parse(request.params).type;
    const type = requestedType === "IMG" ? "IMAGE" : requestedType;
    const bytes = await file.toBuffer();
    const name = `${store.id()}-${basename(file.filename).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const uploaded = await storage.put(name, bytes, file.mimetype);
    return ok("파일 업로드 성공", {
      name,
      type,
      mimeType: file.mimetype,
      size: bytes.length,
      byte: bytes.length,
      url: uploaded.url,
    });
  });
  return app;
}
