import { z } from "zod";

export const idParamSchema = z.object({ id: z.string().uuid() });
export const workspaceIdParamSchema = z.object({ workspaceId: z.string().uuid() });
export const tokenQuerySchema = z.object({ token: z.string() });
export const uploadNameParamSchema = z.object({ name: z.string() });
