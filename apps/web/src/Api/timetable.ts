import { withSeugiApi } from "./client";

export const createTimetableEntry = (input: { workspaceId: string; grade: string | number; classNum: string | number; time: string | number; subject: string; date: string }) =>
  withSeugiApi((api) => api.createTimetable(input));

export const updateTimetableEntry = (id: string, subject: string) =>
  withSeugiApi((api) => api.updateTimetable(id, subject));

export const deleteTimetableEntry = (id: string) =>
  withSeugiApi((api) => api.deleteTimetable(id));

export const getWeeklyTimetable = (workspaceId: string) =>
  withSeugiApi((api) => api.weeklyTimetable(workspaceId));
