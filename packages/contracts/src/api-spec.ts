import { createTaskSchema } from "./task.js";
import { createWorkspaceSchema, joinWorkspaceSchema, updateWorkspaceSchema } from "./workspace.js";

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
  createWorkspace: { method: "POST", path: "/workspace", body: createWorkspaceSchema },
  updateWorkspace: { method: "PATCH", path: "/workspace", body: updateWorkspaceSchema },
  listWorkspaces: { method: "GET", path: "/workspace" },
  joinWorkspace: { method: "POST", path: "/workspace/join", body: joinWorkspaceSchema },
  workspaceMembers: { method: "GET", path: "/workspace/members" },
  workspaceMemberChart: { method: "GET", path: "/workspace/members/chart" },
} as const;
