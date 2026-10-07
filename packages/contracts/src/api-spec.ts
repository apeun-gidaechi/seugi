import { createTaskSchema } from "./task.js";
import { createWorkspaceSchema, joinWorkspaceSchema, updateWorkspaceSchema } from "./workspace.js";
import { editMemberSchema, loginMemberSchema, logoutMemberSchema, memberDeviceTokenSchema, registerMemberSchema } from "./member.js";
import { editProfileSchema, editStudentNumberSchema } from "./profile.js";

/** Shared transport specification consumed by both the API server and SDK. */
export const API_SPEC = {
  registerMember: { method: "POST", path: "/member/register", body: registerMemberSchema },
  loginMember: { method: "POST", path: "/member/login", body: loginMemberSchema },
  editMember: { method: "PATCH", path: "/member/edit", body: editMemberSchema },
  addDeviceToken: { method: "POST", path: "/member/device-token", body: memberDeviceTokenSchema },
  removeDeviceToken: { method: "DELETE", path: "/member/device-token", body: memberDeviceTokenSchema },
  logoutMember: { method: "POST", path: "/member/logout", body: logoutMemberSchema },
  editProfile: { method: "PATCH", path: "/profile/:workspaceId", pathFor: (workspaceId: string) => `/profile/${encodeURIComponent(workspaceId)}`, body: editProfileSchema },
  editStudentNumber: { method: "PATCH", path: "/profile/schidnum/:workspaceId", pathFor: (workspaceId: string) => `/profile/schidnum/${encodeURIComponent(workspaceId)}`, body: editStudentNumberSchema },
  myProfile: { method: "GET", path: "/profile/me" },
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
