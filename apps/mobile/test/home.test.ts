import assert from "node:assert/strict";
import test from "node:test";
import { initialHomeMealPage, shouldLoadClassroomTasks } from "../src/utils/home.ts";

test("iOS home meal carousel starts at the first available meal", () => {
  assert.equal(initialHomeMealPage(new Date(2026, 0, 1, 18, 0), "ios"), 0);
});

test("Android home meal carousel follows the native local-time cutoffs", () => {
  assert.equal(initialHomeMealPage(new Date(2026, 0, 1, 8, 20), "android"), 0);
  assert.equal(initialHomeMealPage(new Date(2026, 0, 1, 8, 21), "android"), 1);
  assert.equal(initialHomeMealPage(new Date(2026, 0, 1, 13, 30), "android"), 1);
  assert.equal(initialHomeMealPage(new Date(2026, 0, 1, 13, 31), "android"), 2);
});

test("only Android home requests Classroom tasks, matching native home data sources", () => {
  assert.equal(shouldLoadClassroomTasks("android"), true);
  assert.equal(shouldLoadClassroomTasks("ios"), false);
});
