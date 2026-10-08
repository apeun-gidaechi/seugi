import { basename } from "node:path";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { API_SPEC, uploadTypeSchema } from "@seugi/contracts";
import type { Store } from "../store.js";
import type { FileStorage } from "../storage.js";
import { ok } from "../http/helpers.js";

export function registerFileRoutes(
  app: FastifyInstance,
  deps: {
    store: Store;
    storage: FileStorage;
    auth: (request: FastifyRequest) => Promise<void>;
  },
) {
  const { store, storage, auth } = deps;

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
}
