import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Store } from "../store.js";
import type { FileStorage } from "../storage.js";
import type { OAuthProvider } from "../oauth.js";
import { registerCoreRoutes } from "./core.js";
import { registerMemberRoutes } from "./member.js";
import { registerAuthRoutes } from "./auth.js";

type Claims = { sub: string };

export function registerEarlyRoutes(
  app: FastifyInstance,
  deps: {
    store: Store;
    storage: FileStorage;
    oauth: OAuthProvider;
    auth: (request: FastifyRequest) => Promise<void>;
    issueTokens: (memberId: string) => { accessToken: string; refreshToken: string };
    accessTokenTtl: string;
    rememberDeviceToken: (memberId: string, token?: string) => void;
  },
) {
  const { store, storage, oauth, auth, issueTokens, accessTokenTtl, rememberDeviceToken } = deps;
  registerCoreRoutes(app, storage);
  registerMemberRoutes(app, {
    store,
    auth,
    issueTokens,
    verifyRefreshToken: (token) => app.jwt.verify<Claims>(token),
    signAccessToken: (memberId) => app.jwt.sign({ sub: memberId }, { expiresIn: accessTokenTtl }),
    rememberDeviceToken,
  });
  registerAuthRoutes(app, { store, oauth, auth, issueTokens, rememberDeviceToken });
}
