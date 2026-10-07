import { path, query, segment } from "./helpers.js";

export const profileApiSpec = {
  editProfile: path("PATCH", "/profile/:workspaceId", (workspaceId: string) => `/profile/${segment(workspaceId)}`),
  editStudentNumber: path("PATCH", "/profile/schidnum/:workspaceId", (workspaceId: string) => `/profile/schidnum/${segment(workspaceId)}`),
  myProfile: query("GET", "/profile/me", (workspaceId: string) => `/profile/me?workspaceId=${segment(workspaceId)}`),
  workspaceMember: query("GET", "/profile/others", (workspaceId: string, memberId: string) => `/profile/others?workspaceId=${segment(workspaceId)}&memberId=${segment(memberId)}`),
} as const;
