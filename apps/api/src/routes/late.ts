import type { FastifyInstance } from "fastify";
import { registerAiRoutes, type AiRouteDeps } from "./ai.js";
import { registerFileRoutes } from "./files.js";
import type { Store } from "../store.js";
import type { FileStorage } from "../storage.js";
import type { FastifyRequest } from "fastify";

export function registerLateRoutes(
  app: FastifyInstance,
  aiDeps: AiRouteDeps,
  fileDeps: {
    store: Store;
    storage: FileStorage;
    auth: (request: FastifyRequest) => Promise<void>;
  },
) {
  registerAiRoutes(app, aiDeps);
  registerFileRoutes(app, fileDeps);
}
