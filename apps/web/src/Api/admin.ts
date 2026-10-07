import { withSeugiApi } from "./client";

export const getWorkspaceMembers = (workspaceId: string) =>
  withSeugiApi((api) => api.workspaceMembers(workspaceId));

export const getWorkspaceWaitlist = (workspaceId: string, role: "TEACHER" | "STUDENT") =>
  withSeugiApi((api) => api.waitlist(workspaceId, role));

export const getWorkspaceCode = (workspaceId: string) =>
  withSeugiApi((api) => api.workspaceCode(workspaceId));

export const approveWorkspaceMembers = (workspaceId: string, memberIds: string[], role: "TEACHER" | "STUDENT") =>
  withSeugiApi((api) => api.approveWorkspaceMembers(workspaceId, memberIds, role));

export const rejectWorkspaceMembers = (workspaceId: string, memberIds: string[], role: "TEACHER" | "STUDENT") =>
  withSeugiApi((api) => api.rejectWorkspaceMembers(workspaceId, memberIds, role));

export const updateWorkspaceMemberRole = (workspaceId: string, memberId: string, role: "MIDDLE_ADMIN") =>
  withSeugiApi((api) => api.setWorkspaceMemberRole(workspaceId, memberId, role));

export const kickWorkspaceMember = (workspaceId: string, memberId: string) =>
  withSeugiApi((api) => api.removeWorkspaceMember(workspaceId, memberId));

export const updateStudentNumber = (workspaceId: string, input: { id: string; schGrade: number; schClass: number; schNumber: number }) =>
  withSeugiApi((api) => api.editStudentNumber(workspaceId, input));
