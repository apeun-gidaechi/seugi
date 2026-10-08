import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  API_SPEC,
  authenticateOAuthSchema,
  connectGoogleSchema,
  emailVerificationSchema,
  oauthProviderSchema,
  sendVerificationQuerySchema,
} from "@seugi/contracts";
import type { Store } from "../store.js";
import type { OAuthProvider } from "../oauth.js";
import { body, ok, query } from "../http/helpers.js";
import { sendVerificationEmail } from "../mailer.js";

type AuthRouteDeps = {
  store: Store;
  oauth: OAuthProvider;
  auth: (request: FastifyRequest) => Promise<void>;
  issueTokens: (memberId: string) => { accessToken: string; refreshToken: string };
  rememberDeviceToken: (memberId: string, token?: string) => void;
};

export function registerAuthRoutes(app: FastifyInstance, deps: AuthRouteDeps) {
  const { store, oauth, auth, issueTokens, rememberDeviceToken } = deps;

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
    ) {
      return reply
        .code(409)
        .send({ message: "코드가 일치하지 않거나 만료되었습니다" });
    }
    return ok("이메일 인증 성공");
  });

  app.post(API_SPEC.authenticateOAuth.path, async (request, reply) => {
    const provider = oauthProviderSchema.parse(request.params).provider;
    const input = body(authenticateOAuthSchema, request);
    const identity =
      provider === "google"
        ? await oauth.google(input.code, input.platform)
        : await oauth.apple(input.code, input.platform, input.name);
    let member = [...store.members.values()].find((item) => item.email === identity.email);
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

  app.post(API_SPEC.connectGoogle.path, { preHandler: auth }, async (request) => {
    const input = body(connectGoogleSchema, request);
    const identity = await oauth.google(input.code, input.platform);
    rememberDeviceToken(request.user.sub, input.token);
    store.oauth.set(`${request.user.sub}:google`, {
      provider: "google",
      accessToken: identity.accessToken,
      refreshToken: identity.refreshToken,
    });
    return ok("구글 연동 성공");
  });

  app.delete(API_SPEC.removeGoogleConnection.path, { preHandler: auth }, async (request) => {
    store.oauth.delete(`${request.user.sub}:google`);
    return ok("삭제 성공 !");
  });

  app.get(API_SPEC.googleConnection.path, { preHandler: auth }, async (request) =>
    ok("구글 연동 상태 조회 성공", store.oauth.has(`${request.user.sub}:google`)),
  );
}
