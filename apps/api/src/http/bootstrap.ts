import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { Store } from "../store.js";

export function registerStoreLifecycle(app: FastifyInstance, store: Store) {
  app.addHook("onRequest", async () => {
    await store.beginRequest();
  });
  app.addHook("onSend", async (_request, reply, payload) => {
    if (reply.statusCode >= 400) await store.rollbackRequest();
    else await store.persist();
    return payload;
  });
}

export function registerApiErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, _request, reply) => {
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const code =
      typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
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
}
