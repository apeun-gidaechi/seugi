import { withSeugiApi } from "./client";

export const toggleNotificationEmoji = (notificationId: string, emoji: string) =>
  withSeugiApi((api) => api.toggleNotificationEmoji(notificationId, emoji));

export const createNotice = (workspaceId: string, title: string, content: string) =>
  withSeugiApi((api) => api.createNotification({ workspaceId, title, content }));

export const updateNotice = (id: string, title: string, content: string) =>
  withSeugiApi((api) => api.updateNotification({ id, title, content }));

export const deleteNotice = (workspaceId: string, id: string) =>
  withSeugiApi((api) => api.deleteNotification(workspaceId, id));
