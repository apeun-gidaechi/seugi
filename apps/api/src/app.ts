import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { Store } from "./store.js";
import { NeisClient } from "./neis.js";
import { OAuthProvider } from "./oauth.js";
import { PushNotifications } from "./push.js";
import { FileStorage } from "./storage.js";
import { redactRequestUrl } from "./logging.js";
import { registerApiErrorHandler, registerStoreLifecycle } from "./http/bootstrap.js";
import { registerEarlyRoutes } from "./routes/early.js";
import { registerAuthenticatedRoutes } from "./registerRoutes.js";

type Claims = { sub: string };
declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: Claims;
  }
}

export async function buildApp(store = new Store()): Promise<FastifyInstance> {
  const jwtSecret =
    process.env.JWT_SECRET ??
    (process.env.NODE_ENV === "production" ? undefined : "development-only-change-me");
  if (!jwtSecret) throw new Error("JWT_SECRET_REQUIRED");
  const app = Fastify({
    logger: {
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: redactRequestUrl(String(request.url ?? "")),
            host: request.headers.host,
            remoteAddress: request.ip,
          };
        },
      },
    },
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
    refreshToken: app.jwt.sign({ sub: memberId }, { expiresIn: refreshTokenTtl }),
  });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  registerStoreLifecycle(app, store);
  registerApiErrorHandler(app);
  const rememberDeviceToken = (memberId: string, token?: string) => {
    if (token) {
      store.deviceTokens.set(memberId, [
        ...new Set([...(store.deviceTokens.get(memberId) ?? []), token]),
      ]);
    }
  };
  registerEarlyRoutes(app, {
    store,
    storage,
    oauth,
    auth,
    issueTokens,
    accessTokenTtl,
    rememberDeviceToken,
  });

  registerAuthenticatedRoutes(app, {
    store,
    neis,
    oauth,
    push,
    storage,
    auth,
  });
  return app;
}
