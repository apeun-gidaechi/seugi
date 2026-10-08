export type NotificationTokenAction = "register" | "request-and-register" | "remove" | "none";

export function notificationTokenAction(
  enabled: boolean,
  token: string | undefined,
  hasProjectId: boolean,
): NotificationTokenAction {
  if (!enabled) return token ? "remove" : "none";
  if (token) return "register";
  return hasProjectId ? "request-and-register" : "none";
}
