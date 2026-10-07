import { path, route, segment } from "./helpers.js";

export const notificationApiSpec = {
  createNotification: route("POST", "/notification"),
  listNotifications: path("GET", "/notification/:workspaceId", (id: string, page = "0", size = "20") => `/notification/${segment(id)}?page=${segment(page)}&size=${segment(size)}`),
  updateNotification: route("PATCH", "/notification"),
  deleteNotification: path("DELETE", "/notification/:workspaceId/:id", (workspaceId: string, id: string) => `/notification/${segment(workspaceId)}/${segment(id)}`),
  toggleNotificationEmoji: route("PATCH", "/notification/emoji"),
} as const;
