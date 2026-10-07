import { z } from "zod";

const deviceTokenSchema = z.string().min(1).max(4096);
const profileImageSchema = z.string().url().or(z.string().regex(/^\/uploads\/[0-9a-f-]{36}-[a-zA-Z0-9._%+-]+$/i));

export const registerMemberSchema = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(1).max(40).optional(), token: deviceTokenSchema.optional(), code: z.string().regex(/^\d{6}$/) });
export const loginMemberSchema = registerMemberSchema.pick({ email: true, password: true, token: true });
export const editMemberSchema = z.object({ name: z.string().min(1).max(40).optional(), picture: profileImageSchema.optional(), birth: z.string().max(32).optional() });
export const memberDeviceTokenSchema = z.object({ token: deviceTokenSchema });
export const logoutMemberSchema = z.object({ deviceToken: deviceTokenSchema.optional(), fcmToken: deviceTokenSchema.optional() });
export const emailVerificationSchema = z.object({ email: z.string().email(), code: z.string().regex(/^\d{6}$/) });

export type RegisterMemberInput = z.input<typeof registerMemberSchema>;
export type LoginMemberInput = z.input<typeof loginMemberSchema>;
export type EditMemberInput = z.input<typeof editMemberSchema>;
