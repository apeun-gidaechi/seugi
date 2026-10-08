import { withSeugiApi } from "./client";
import { homeNotificationRequest } from "../utils/homeNotifications";

export const getTimeTable = async (workspaceId: string) => {
  return withSeugiApi((api) => api.timetable(workspaceId));
};

export const getNotification = async (workspaceId: string, page: number) => {
  const request = homeNotificationRequest(page);
  return withSeugiApi((api) => api.notifications(workspaceId, request.page, request.size));
};

export const fetchingNotice = async (workspaceId: string) => {
  return withSeugiApi((api) => api.notifications(workspaceId));
};

export const getMenus = async (workspaceId: string, date: string) => {
  const meals = await withSeugiApi((api) => api.mealForDate(workspaceId, date));
  return meals.map((meal, index) => ({
    id: `${meal.date}-${meal.type}-${index}`,
    workspaceId,
    mealType: meal.type as "조식" | "중식" | "석식",
    menu: meal.menu,
    calorie: meal.calorie ?? "",
    mealInfo: meal.menu,
    mealDate: meal.date,
  }));
};

export const getSchedules = async (workspaceId: string, month: string) => {
  const schedules = await withSeugiApi((api) => api.schedulesForMonth(workspaceId, Number(month)));
  return schedules.map((schedule) => ({
    id: `${schedule.date}-${schedule.name}`,
    workspaceId: schedule.workspaceId,
    date: schedule.date,
    eventName: schedule.name,
    eventContent: "",
    grade: [] as number[],
  }));
};

export const getTasks = async (workspaceId: string) => {
  return withSeugiApi((api) => api.tasks(workspaceId));
};

export const getClassroomTasks = async () => {
  return withSeugiApi((api) => api.classroomTasks());
};
