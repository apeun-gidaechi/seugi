import { z } from "zod";

const workspaceImageSchema = z.string().url().or(z.string().regex(/^\/uploads\/[0-9a-f-]{36}-[a-zA-Z0-9._%+-]+$/i));

/** Request contracts shared by the workspace API, SDK, web and mobile apps. */
export const workspaceFieldsSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  workspaceName: z.string().min(1).max(80).optional(),
  schoolCode: z.string().optional(),
  educationOfficeCode: z.string().optional(),
  schoolType: z.string().optional(),
  image: workspaceImageSchema.optional(),
  workspaceImageUrl: workspaceImageSchema.or(z.literal("")).optional(),
  workspaceImgUrl: workspaceImageSchema.or(z.literal("")).optional(),
});

export const createWorkspaceSchema = workspaceFieldsSchema.refine(
  (value) => !!(value.name ?? value.workspaceName),
  "워크스페이스 이름이 필요합니다",
);

export const updateWorkspaceSchema = workspaceFieldsSchema
  .extend({ workspaceId: z.string().uuid() })
  .refine(
    (value) => value.name !== undefined || value.workspaceName !== undefined || value.image !== undefined || value.workspaceImageUrl !== undefined || value.workspaceImgUrl !== undefined,
    "변경할 항목이 필요합니다",
  );

export const joinWorkspaceSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  code: z.string().optional(),
  workspaceCode: z.string().optional(),
  role: z.enum(["STUDENT", "TEACHER", "MIDDLE_ADMIN"]).default("STUDENT"),
}).refine((input) => input.workspaceId || input.code || input.workspaceCode, "워크스페이스 정보가 필요합니다");

export type CreateWorkspaceInput = z.input<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.input<typeof updateWorkspaceSchema>;
export type JoinWorkspaceInput = z.input<typeof joinWorkspaceSchema>;
