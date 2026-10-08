import type { Meal, Schedule, Timetable } from "@seugi/contracts";

const MEAL_PRIORITY: Record<string, number> = { 조식: 0, 중식: 1, 석식: 2 };

export function homeTodaysMeals(meals: Meal[] | undefined, today: string) {
  return (meals ?? [])
    .filter((item) => item.date.slice(0, 10) === today)
    .sort(
      (a, b) =>
        (MEAL_PRIORITY[a.type] ?? Number.MAX_SAFE_INTEGER) -
        (MEAL_PRIORITY[b.type] ?? Number.MAX_SAFE_INTEGER),
    );
}

export function homeMealPages(todaysMeals: Meal[], platform: "ios" | "android") {
  return platform === "android"
    ? ["조식", "중식", "석식"].map((type) => ({
        type,
        meal: todaysMeals.find((item) => item.type === type),
      }))
    : todaysMeals.map((meal) => ({ type: meal.type, meal }));
}

export function homeMealTypeLabel(type: string, platform: "ios" | "android") {
  if (platform !== "android") return type;
  if (type === "조식") return "아침";
  if (type === "중식") return "점심";
  if (type === "석식") return "저녁";
  return type;
}

export function homeTodaysTimetable(timetable: Timetable[], today: string) {
  return timetable
    .filter((item) => item.date.slice(0, 10) === today)
    .sort((a, b) => Number(a.time) - Number(b.time));
}

export function homeUpcomingSchedules(schedules: Schedule[], today: string, platform: "ios" | "android") {
  return schedules
    .filter((item) =>
      platform === "ios"
        ? item.date.slice(0, 10) > today
        : Number(item.date.slice(8, 10)) >= new Date().getDate(),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, platform === "android" ? 3 : undefined);
}

export function homeScheduleDaysUntil(from: string, to: string) {
  const fromDate = new Date(`${from.slice(0, 10)}T00:00:00`);
  const toDate = new Date(`${to.slice(0, 10)}T00:00:00`);
  return Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000);
}

export function homeScheduleMonthDay(value: string) {
  const [, month = "", day = ""] = value.slice(0, 10).split("-");
  return `${Number(month)}/${day}`;
}

export function homeAssignmentsLoadFailed(
  platform: "ios" | "android",
  tasksFailed: boolean,
  classroomTasksFailed: boolean,
) {
  return platform === "ios" ? tasksFailed : tasksFailed && classroomTasksFailed;
}

export function getCurrentTimetablePeriod(entries: Timetable[], now = new Date()) {
  const startTime = new Date(now);
  startTime.setHours(8, 50, 0, 0);
  const selectedIndex = Math.trunc((now.getTime() - startTime.getTime()) / (60 * 60 * 1000));
  return {
    period: selectedIndex + 1,
    allPeriodsOver: selectedIndex >= entries.length,
  };
}
