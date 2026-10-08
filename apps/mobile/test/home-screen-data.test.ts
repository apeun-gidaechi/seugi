import assert from "node:assert/strict";
import test from "node:test";
import {
  getCurrentTimetablePeriod,
  homeMealPages,
  homeTodaysMeals,
  homeUpcomingSchedules,
} from "../src/utils/homeScreenData.ts";

test("home meal pages use fixed slots on Android and dynamic list on iOS", () => {
  const meals = [
    { date: "2026-10-08", type: "중식", menu: ["밥"], calorie: "" },
    { date: "2026-10-08", type: "석식", menu: ["국"], calorie: "" },
  ];
  const today = homeTodaysMeals(meals, "2026-10-08");
  assert.equal(homeMealPages(today, "android").length, 3);
  assert.equal(homeMealPages(today, "ios").length, 2);
});

test("home upcoming schedules cap Android at three future items", () => {
  const schedules = [
    { id: "1", workspaceId: "w", name: "a", title: "a", date: "2026-10-09", content: "" },
    { id: "2", workspaceId: "w", name: "b", title: "b", date: "2026-10-10", content: "" },
    { id: "3", workspaceId: "w", name: "c", title: "c", date: "2026-10-11", content: "" },
    { id: "4", workspaceId: "w", name: "d", title: "d", date: "2026-10-12", content: "" },
  ];
  assert.equal(homeUpcomingSchedules(schedules, "2026-10-08", "android").length, 3);
  assert.equal(homeUpcomingSchedules(schedules, "2026-10-08", "ios").length, 4);
});

test("current timetable period starts after 08:50 local time", () => {
  const entries = [
    { id: "1", workspaceId: "w", grade: "1", classNum: "1", time: "1", subject: "수학", date: "2026-10-08" },
    { id: "2", workspaceId: "w", grade: "1", classNum: "1", time: "2", subject: "영어", date: "2026-10-08" },
  ];
  const atFirst = getCurrentTimetablePeriod(entries, new Date(2026, 9, 8, 9, 30));
  assert.equal(atFirst.period, 1);
  assert.equal(atFirst.allPeriodsOver, false);
});
