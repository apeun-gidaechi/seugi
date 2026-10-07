import { z } from "zod";

export const createNotificationSchema = z.object({ workspaceId: z.string().uuid(), title: z.string().min(1).max(100), content: z.string().min(1) });
export const updateNotificationSchema = z.object({ id: z.string().uuid(), title: z.string().min(1).max(100), content: z.string().min(1) });
export const notificationEmojiSchema = z.object({ notificationId: z.string().uuid(), emoji: z.string().min(1).max(16) });
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>;
