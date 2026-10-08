export const HOME_NOTIFICATION_PAGE_SIZE = 365;

export function homeNotificationRequest(page: number) {
  return { page, size: HOME_NOTIFICATION_PAGE_SIZE };
}
