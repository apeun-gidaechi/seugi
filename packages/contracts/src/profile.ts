import { z } from "zod";

export const editProfileSchema = z.object({ phone: z.string().max(40).optional(), status: z.string().max(160).optional(), nick: z.string().max(40).optional(), spot: z.string().max(80).optional(), belong: z.string().max(120).optional(), wire: z.string().max(40).optional(), location: z.string().max(120).optional() });
export const editStudentNumberSchema = z.object({ id: z.string().uuid().optional(), grade: z.number().int().positive().optional(), class: z.number().int().positive().optional(), number: z.number().int().positive().optional(), schGrade: z.number().int().positive().optional(), schClass: z.number().int().positive().optional(), schNumber: z.number().int().positive().optional() }).refine((value) => (value.grade ?? value.schGrade) && (value.class ?? value.schClass) && (value.number ?? value.schNumber));
export const profileWorkspaceQuerySchema = z.object({ workspaceId: z.string().uuid() });
export const otherProfileQuerySchema = profileWorkspaceQuerySchema.extend({ memberId: z.string().uuid() });

export type EditProfileInput = z.infer<typeof editProfileSchema>;
export type EditStudentNumberInput = z.input<typeof editStudentNumberSchema>;
