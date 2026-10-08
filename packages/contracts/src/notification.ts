import { z } from "zod";

export const createNotificationSchema = z.object({ workspaceId: z.string().uuid(), title: z.string().min(1).max(100), content: z.string().min(1) });
export const updateNotificationSchema = z.object({ id: z.string().uuid(), title: z.string().min(1).max(100), content: z.string().min(1) });
export const notificationEmojiSchema = z.object({ notificationId: z.string().uuid(), emoji: z.string().min(1).max(16) });
export const notificationPageQuerySchema = z.object({ page: z.coerce.number().int().min(0).default(0), size: z.coerce.number().int().min(1).max(365).default(20) });
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>;
export type NotificationPageQuery = z.infer<typeof notificationPageQuerySchema>;
