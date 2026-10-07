import { path, route, segment } from "./helpers.js";

export const notificationApiSpec = {
  createNotification: route("POST", "/notification"),
  listNotifications: path("GET", "/notification/:workspaceId", (id: string) => `/notification/${segment(id)}`),
  updateNotification: route("PATCH", "/notification"),
  deleteNotification: path("DELETE", "/notification/:workspaceId/:id", (workspaceId: string, id: string) => `/notification/${segment(workspaceId)}/${segment(id)}`),
  toggleNotificationEmoji: route("PATCH", "/notification/emoji"),
} as const;
