import { withSeugiApi } from "./client";

export const getTimeTable = async (workspaceId: string) => {
  return withSeugiApi((api) => api.timetable(workspaceId));
};

export const getNotification = async (workspaceId: string, page: number) => {
  void page;
  return withSeugiApi((api) => api.notifications(workspaceId));
};

export const fetchingNotice = async (workspaceId: string) => {
  return withSeugiApi((api) => api.notifications(workspaceId));
};

export const getMenus = async (workspaceId: string, date: string) => {
  return withSeugiApi((api) => api.mealForDate(workspaceId, date));
};

export const getSchedules = async (workspaceId: string, month: string) => {
  return withSeugiApi((api) => api.schedulesForMonth(workspaceId, Number(month)));
};

export const getTasks = async (workspaceId: string) => {
  return withSeugiApi((api) => api.tasks(workspaceId));
};

export const getClassroomTasks = async () => {
  return withSeugiApi((api) => api.classroomTasks());
};
