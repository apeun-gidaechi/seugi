import { basename } from "node:path";
import type { FastifyInstance } from "fastify";
import { API_SPEC, uploadNameParamSchema } from "@seugi/contracts";
import type { FileStorage } from "../storage.js";
import { ok } from "../http/helpers.js";

export function registerCoreRoutes(app: FastifyInstance, storage: FileStorage) {
  app.get(API_SPEC.health.path, async () => ok("healthy", { status: "ok" }));
  app.get(API_SPEC.uploadedFile.path, async (request, reply) => {
    const name = basename(uploadNameParamSchema.parse(request.params).name);
    try {
      return reply.send(await storage.read(name));
    } catch (error) {
      if (error instanceof Error && error.message === "FILE_NOT_FOUND") {
        return reply.code(404).send({ message: "FILE_NOT_FOUND" });
      }
      throw error;
    }
  });
}
