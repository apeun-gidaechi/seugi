import type { FastifyInstance, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import {
  API_SPEC,
  editMemberSchema,
  loginMemberSchema,
  logoutMemberSchema,
  memberDeviceTokenSchema,
  registerMemberSchema,
  tokenQuerySchema,
} from "@seugi/contracts";
import type { Store } from "../store.js";
import { body, ok, query } from "../http/helpers.js";

type Claims = { sub: string };

type MemberRouteDeps = {
  store: Store;
  auth: (request: FastifyRequest) => Promise<void>;
  issueTokens: (memberId: string) => { accessToken: string; refreshToken: string };
  verifyRefreshToken: (token: string) => Claims;
  signAccessToken: (memberId: string) => string;
  rememberDeviceToken: (memberId: string, token?: string) => void;
};

export function registerMemberRoutes(app: FastifyInstance, deps: MemberRouteDeps) {
  const { store, auth, issueTokens, verifyRefreshToken, signAccessToken, rememberDeviceToken } =
    deps;

  app.post(API_SPEC.registerMember.path, async (request, reply) => {
    const input = body(registerMemberSchema, request);
    const verification = store.emailCodes.get(input.email);
    if (!verification || verification.expiresAt < Date.now() || verification.code !== input.code) {
      return reply.code(409).send({ message: "이메일 인증 코드가 일치하지 않거나 만료되었습니다" });
    }
    if ([...store.members.values()].some((member) => member.email === input.email)) {
      return reply.code(409).send({ message: "이미 가입된 이메일입니다" });
    }
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
      candidate?.password && (await bcrypt.compare(input.password, candidate.password))
        ? candidate
        : undefined;
    if (!member) {
      return reply.code(401).send({ message: "이메일 또는 비밀번호가 올바르지 않습니다" });
    }
    const tokens = issueTokens(member.id);
    member.refreshToken = tokens.refreshToken;
    rememberDeviceToken(member.id, input.token);
    return ok("로그인 성공", tokens);
  });

  app.get(API_SPEC.refreshMember.path, async (request, reply) => {
    const token = query(tokenQuerySchema, request).token;
    try {
      const claims = verifyRefreshToken(token);
      const member = store.requireMember(claims.sub);
      if (member.refreshToken !== token) throw new Error();
      return ok("토큰 재발급 성공", signAccessToken(member.id));
    } catch {
      return reply.code(401).send({ message: "유효하지 않은 리프레시 토큰입니다" });
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

  app.post(API_SPEC.addDeviceToken.path, { preHandler: auth }, async (request) => {
    const token = body(memberDeviceTokenSchema, request).token;
    store.deviceTokens.set(request.user.sub, [
      ...new Set([...(store.deviceTokens.get(request.user.sub) ?? []), token]),
    ]);
    return ok("기기 알림 토큰 등록 성공");
  });

  app.delete(API_SPEC.removeDeviceToken.path, { preHandler: auth }, async (request) => {
    const token = body(memberDeviceTokenSchema, request).token;
    store.deviceTokens.set(
      request.user.sub,
      (store.deviceTokens.get(request.user.sub) ?? []).filter((value) => value !== token),
    );
    return ok("기기 알림 토큰 삭제 성공");
  });

  app.post(API_SPEC.logoutMember.path, { preHandler: auth }, async (request) => {
    const token = body(logoutMemberSchema, request);
    store.requireMember(request.user.sub).refreshToken = undefined;
    const deviceToken = token.deviceToken ?? token.fcmToken;
    if (deviceToken) {
      store.deviceTokens.set(
        request.user.sub,
        (store.deviceTokens.get(request.user.sub) ?? []).filter((value) => value !== deviceToken),
      );
    }
    return ok("로그아웃 성공");
  });

  app.delete(API_SPEC.removeMember.path, { preHandler: auth }, async (request) => {
    const member = store.requireMember(request.user.sub);
    member.deleted = true;
    member.refreshToken = undefined;
    store.deviceTokens.delete(request.user.sub);
    return ok("회원 탈퇴 성공");
  });
}
