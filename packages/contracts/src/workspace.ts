import { z } from "zod";

const workspaceImageSchema = z.string().url().or(z.string().regex(/^\/uploads\/[0-9a-f-]{36}-[a-zA-Z0-9._%+-]+$/i));

/** Request contracts shared by the workspace API, SDK, web and mobile apps. */
export const workspaceFieldsSchema = z.object({
  name: z.string().optional(),
  workspaceName: z.string().optional(),
  schoolCode: z.string().optional(),
  educationOfficeCode: z.string().optional(),
  schoolType: z.string().optional(),
  image: workspaceImageSchema.optional(),
  workspaceImageUrl: workspaceImageSchema.or(z.literal("")).optional(),
  workspaceImgUrl: workspaceImageSchema.or(z.literal("")).optional(),
});

export const createWorkspaceSchema = workspaceFieldsSchema.refine(
  (value) => !!(value.name ?? value.workspaceName)?.trim(),
  "워크스페이스 이름이 필요합니다",
);

export const updateWorkspaceSchema = workspaceFieldsSchema
  .extend({ workspaceId: z.string().uuid() })
  .refine(
    (value) => (value.name !== undefined || value.workspaceName !== undefined || value.image !== undefined || value.workspaceImageUrl !== undefined || value.workspaceImgUrl !== undefined)
      && (value.name ?? value.workspaceName ?? "").trim() !== "",
    "변경할 항목이 필요합니다",
  );

export const joinWorkspaceSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  code: z.string().optional(),
  workspaceCode: z.string().optional(),
  role: z.enum(["STUDENT", "TEACHER"]).default("STUDENT"),
}).refine((input) => input.workspaceId || input.code || input.workspaceCode, "워크스페이스 정보가 필요합니다");

export const workspaceNotificationsSchema = z.object({ receivePush: z.boolean() });
export const workspaceMemberSchema = z.object({ workspaceId: z.string().uuid(), memberId: z.string().uuid() });
export const workspaceWaitlistActionSchema = z.object({ workspaceId: z.string().uuid(), memberId: z.string().uuid().optional(), memberIds: z.array(z.string().uuid()).default([]), userSet: z.array(z.string().uuid()).default([]), role: z.enum(["STUDENT", "TEACHER", "MIDDLE_ADMIN"]).default("STUDENT") });
export const workspaceWaitlistQuerySchema = z.object({ workspaceId: z.string().uuid(), role: z.enum(["STUDENT", "TEACHER"]).default("STUDENT") });
export const workspaceRoleSchema = z.enum(["STUDENT", "TEACHER", "MIDDLE_ADMIN", "MIDDLEADMIN", "ADMIN"]);
export const updateWorkspaceMemberRoleSchema = workspaceMemberSchema.extend({ role: workspaceRoleSchema.optional(), workspaceRole: workspaceRoleSchema.optional() }).refine((value) => !!(value.role ?? value.workspaceRole));
export const kickWorkspaceMembersSchema = z.object({ workspaceId: z.string().uuid(), memberId: z.string().uuid().optional(), memberList: z.array(z.string().uuid()).optional() }).refine((value) => !!value.memberId || !!value.memberList?.length);
export const workspaceCodeParamSchema = z.object({ code: z.string() });

export type CreateWorkspaceInput = z.input<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.input<typeof updateWorkspaceSchema>;
export type JoinWorkspaceInput = z.input<typeof joinWorkspaceSchema>;
export type WorkspaceWaitlistActionInput = z.input<typeof workspaceWaitlistActionSchema>;
export type UpdateWorkspaceMemberRoleInput = z.input<typeof updateWorkspaceMemberRoleSchema>;
export type KickWorkspaceMembersInput = z.input<typeof kickWorkspaceMembersSchema>;
export interface WorkspaceSearchSummary { workspaceId: string; workspaceName: string; workspaceImageUrl: string; studentCount: number; teacherCount: number }
