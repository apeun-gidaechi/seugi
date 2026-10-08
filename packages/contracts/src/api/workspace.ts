import { path, query, route, segment } from "./helpers.js";

export const workspaceApiSpec = {
  createWorkspace: route("POST", "/workspace"),
  updateWorkspace: route("PATCH", "/workspace"),
  listWorkspaces: route("GET", "/workspace"),
  workspaceDetails: path(
    "GET",
    "/workspace/:workspaceId",
    (workspaceId: string) => `/workspace/${segment(workspaceId)}`,
  ),
  deleteWorkspace: path(
    "DELETE",
    "/workspace/:workspaceId",
    (workspaceId: string) => `/workspace/${segment(workspaceId)}`,
  ),
  joinWorkspace: route("POST", "/workspace/join"),
  workspaceMembers: query(
    "GET",
    "/workspace/members",
    (id: string) => `/workspace/members?workspaceId=${segment(id)}`,
  ),
  workspaceMemberChart: query(
    "GET",
    "/workspace/members/chart",
    (id: string) => `/workspace/members/chart?workspaceId=${segment(id)}`,
  ),
  workspaceNotificationPreference: path(
    "GET",
    "/workspace/:workspaceId/notifications",
    (id: string) => `/workspace/${segment(id)}/notifications`,
  ),
  setWorkspaceNotificationPreference: path(
    "PATCH",
    "/workspace/:workspaceId/notifications",
    (id: string) => `/workspace/${segment(id)}/notifications`,
  ),
  workspaceCode: path(
    "GET",
    "/workspace/code/:workspaceId",
    (workspaceId: string) => `/workspace/code/${segment(workspaceId)}`,
  ),
  searchWorkspace: path(
    "GET",
    "/workspace/search/:code",
    (code: string) => `/workspace/search/${segment(code)}`,
  ),
  approveWorkspaceMembers: route("PATCH", "/workspace/add"),
  rejectWorkspaceMembers: route("DELETE", "/workspace/cancel"),
  workspaceWaitlist: query(
    "GET",
    "/workspace/wait-list",
    (id: string, role: string = "STUDENT") =>
      `/workspace/wait-list?workspaceId=${segment(id)}&role=${segment(role)}`,
  ),
  updateWorkspaceMemberRole: route("PATCH", "/workspace/permission"),
  kickWorkspaceMembers: route("PATCH", "/workspace/kick"),
  myWaitingWorkspaces: route("GET", "/workspace/my/wait-list"),
} as const;
