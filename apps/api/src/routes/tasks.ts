import type { FastifyInstance, FastifyRequest } from "fastify";
import { API_SPEC, createTaskSchema } from "@seugi/contracts";
import type { Store } from "../store.js";
import type { OAuthProvider } from "../oauth.js";
import { fetchClassroomTasks } from "../classroom.js";
import { body, ok } from "../http/helpers.js";
import { workspaceParam } from "./params.js";

export function registerTaskRoutes(
  app: FastifyInstance,
  deps: {
    store: Store;
    oauth: OAuthProvider;
    auth: (request: FastifyRequest) => Promise<void>;
  },
) {
  const { store, oauth, auth } = deps;

  app.post(API_SPEC.createTask.path, { preHandler: auth }, async (request) => {
    const input = body(createTaskSchema, request);
    if (!store.canAccess(input.workspaceId, request.user.sub)) throw new Error("권한이 없습니다");
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
    if (!store.canAccess(workspaceId, request.user.sub)) throw new Error("권한이 없습니다");
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

  app.get(API_SPEC.classroomTasks.path, { preHandler: auth }, async (request) => {
    const connection = store.oauth.get(`${request.user.sub}:google`);
    if (!connection || connection.provider !== "google")
      throw new Error("GOOGLE_CONNECTION_NOT_FOUND");
    try {
      return ok("클래스룸 과제 불러오기 성공 !", await fetchClassroomTasks(connection));
    } catch (error) {
      if (
        !(error instanceof Error) ||
        error.message !== "GOOGLE_CLASSROOM_401" ||
        !connection.refreshToken
      )
        throw error;
      connection.accessToken = await oauth.refreshGoogle(connection.refreshToken);
      return ok("클래스룸 과제 불러오기 성공 !", await fetchClassroomTasks(connection));
    }
  });
}
