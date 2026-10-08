export function orderAssignments<T extends { dueDate?: string | null }>(
  items: T[],
  platform: string,
): T[] {
  if (platform !== "android") return items;

  // Kotlin's sortedBy places null due dates before dated assignments.
  return [...items].sort((left, right) =>
    (left.dueDate ?? "").localeCompare(right.dueDate ?? ""),
  );
}

export function formatAssignmentDueDate(
  dueDate: string | null | undefined,
  platform: string,
  now = new Date(),
) {
  if (!dueDate) return platform === "ios" ? "기한 없음" : "기한없음";

  const [year, month, day] = dueDate.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "";
  const dueDay = Date.UTC(year, month - 1, day);
  const todayDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((dueDay - todayDay) / 86_400_000);

  if (platform === "ios") return `D-${days}`;
  if (days > 0) return `D-${days}`;
  if (days < 0) return `D+${Math.abs(days)}`;
  return "D Day";
}

export function taskCreateFailureMessage(platform: string, error: unknown) {
  if (platform === "android") return "과제 생성에 실패하였습니다.";
  return error instanceof Error ? error.message : "과제를 만들지 못했습니다";
}

/** Android serializes its selected local calendar date as a timezone-free LocalDateTime. */
export function serializeTaskDueDate(localDate: string) {
  return `${localDate}T00:00:00.000000`;
}

export function formatHomeAssignmentDueDate(
  dueDate: string | null | undefined,
  platform: string,
  now = new Date(),
) {
  if (!dueDate) return "기한없음";
  const due = new Date(dueDate);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((dueDay.getTime() - today.getTime()) / 86_400_000);
  if (platform === "ios") return `D-${days}`;
  if (days > 0) return `D-${days}`;
  if (days < 0) return `D+${Math.abs(days)}`;
  return "D-Day";
}
