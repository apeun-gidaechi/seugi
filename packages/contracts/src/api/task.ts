import { path, route, segment } from "./helpers.js";

export const taskApiSpec = {
  createTask: route("POST", "/task"),
  listTasks: path("GET", "/task/:workspaceId", (id: string) => `/task/${segment(id)}`),
  classroomTasks: route("GET", "/task/classroom"),
} as const;
