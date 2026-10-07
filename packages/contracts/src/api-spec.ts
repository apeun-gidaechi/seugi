import { createTaskSchema } from "./task.js";

/** Shared transport specification consumed by both the API server and SDK. */
export const API_SPEC = {
  createTask: {
    method: "POST",
    path: "/task",
    body: createTaskSchema,
  },
  listTasks: {
    method: "GET",
    path: "/task/:workspaceId",
    pathFor: (workspaceId: string) => `/task/${encodeURIComponent(workspaceId)}`,
  },
} as const;
