import { z } from "zod";

export const oauthProviderSchema = z.object({ provider: z.enum(["google", "apple"]) });
export const authenticateOAuthSchema = z.object({ code: z.string().min(1), token: z.string().min(1).max(4096).optional(), platform: z.enum(["WEB", "ANDROID", "IOS"]).default("WEB"), name: z.string().optional() });
export const connectGoogleSchema = z.object({ code: z.string().min(1), token: z.string().min(1).max(4096).optional(), platform: z.enum(["WEB", "ANDROID", "IOS"]).default("WEB") });
export const sendVerificationQuerySchema = z.object({ email: z.string().email() });
export const aiPromptSchema = z.object({ message: z.string().min(1).max(4000), workspaceId: z.string().uuid().optional() });
export const uploadTypeSchema = z.object({ type: z.enum(["IMAGE", "IMG", "FILE", "PROFILE", "EMOJI"]) });

export type AuthenticateOAuthInput = z.input<typeof authenticateOAuthSchema>;
export type ConnectGoogleInput = z.input<typeof connectGoogleSchema>;
