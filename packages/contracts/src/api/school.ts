import { path, query, route, segment } from "./helpers.js";

export const schoolApiSpec = {
  createTimetable: route("POST", "/timetable"),
  updateTimetable: route("PATCH", "/timetable"),
  deleteTimetable: path("DELETE", "/timetable/:id", (id: string) => `/timetable/${segment(id)}`),
  resetTimetable: query(
    "POST",
    "/timetable/reset",
    (id: string) => `/timetable/reset?workspaceId=${segment(id)}`,
  ),
  dailyTimetable: query(
    "GET",
    "/timetable/day",
    (id: string) => `/timetable/day?workspaceId=${segment(id)}`,
  ),
  weeklyTimetable: query(
    "GET",
    "/timetable/weekend",
    (id: string, grade?: string, classNum?: string) =>
      `/timetable/weekend?workspaceId=${segment(id)}${grade && classNum ? `&grade=${segment(grade)}&classNum=${segment(classNum)}` : ""}`,
  ),
  mealForDate: query(
    "GET",
    "/meal",
    (id: string, date: string) => `/meal?workspaceId=${segment(id)}&date=${segment(date)}`,
  ),
  meals: query(
    "GET",
    "/meal/all",
    (id: string, year?: number, month?: number) =>
      `/meal/all?workspaceId=${segment(id)}${year !== undefined && month !== undefined ? `&year=${year}&month=${month}` : ""}`,
  ),
  resetMeals: path(
    "POST",
    "/meal/reset/:workspaceId",
    (id: string) => `/meal/reset/${segment(id)}`,
  ),
  schedules: path("GET", "/schedule/:workspaceId", (id: string) => `/schedule/${segment(id)}`),
  monthSchedules: query(
    "GET",
    "/schedule/month",
    (id: string, month: number) => `/schedule/month?workspaceId=${segment(id)}&month=${month}`,
  ),
} as const;
