import assert from "node:assert/strict";
import test from "node:test";
import {
  formatAssignmentDueDate,
  formatHomeAssignmentDueDate,
  orderAssignments,
  serializeTaskDueDate,
  taskCreateFailureMessage,
} from "../src/utils/assignments.ts";

test("Android assignments sort by due date and keep undated tasks first like Kotlin sortedBy", () => {
  const tasks = [
    { id: "later", dueDate: "2026-10-12" },
    { id: "undated", dueDate: null },
    { id: "earlier", dueDate: "2026-10-09" },
  ];

  assert.deepEqual(
    orderAssignments(tasks, "android").map(({ id }) => id),
    ["undated", "earlier", "later"],
  );
});

test("iOS preserves the API task order", () => {
  const tasks = [
    { id: "later", dueDate: "2026-10-12" },
    { id: "undated", dueDate: null },
    { id: "earlier", dueDate: "2026-10-09" },
  ];

  assert.equal(orderAssignments(tasks, "ios"), tasks);
});

test("assignment due labels retain Android and iOS native wording and date math", () => {
  const today = new Date(2026, 9, 8, 12);
  assert.equal(formatAssignmentDueDate("2026-10-08T00:00:00.000Z", "android", today), "D Day");
  assert.equal(formatAssignmentDueDate("2026-10-08T00:00:00.000Z", "ios", today), "D-0");
  assert.equal(formatAssignmentDueDate("2026-10-11T00:00:00.000Z", "android", today), "D-3");
  assert.equal(formatAssignmentDueDate("2026-10-05T00:00:00.000Z", "android", today), "D+3");
  assert.equal(formatAssignmentDueDate("2026-10-05T00:00:00.000Z", "ios", today), "D--3");
  assert.equal(formatAssignmentDueDate(undefined, "android", today), "기한없음");
  assert.equal(formatAssignmentDueDate(undefined, "ios", today), "기한 없음");
});

test("task creation failures use the native Android toast text", () => {
  assert.equal(
    taskCreateFailureMessage("android", new Error("server detail")),
    "과제 생성에 실패하였습니다.",
  );
  assert.equal(taskCreateFailureMessage("ios", new Error("server detail")), "server detail");
});

test("task creation sends the picked local date in Android LocalDateTime wire format", () => {
  assert.equal(serializeTaskDueDate("2026-10-08"), "2026-10-08T00:00:00.000000");
});

test("home assignment D-day labels retain each native platform's date math", () => {
  const today = new Date(2026, 9, 8, 12);
  assert.equal(formatHomeAssignmentDueDate("2026-10-08T12:00:00", "android", today), "D-Day");
  assert.equal(formatHomeAssignmentDueDate("2026-10-08T12:00:00", "ios", today), "D-0");
  assert.equal(formatHomeAssignmentDueDate("2026-10-05T12:00:00", "android", today), "D+3");
  assert.equal(formatHomeAssignmentDueDate("2026-10-05T12:00:00", "ios", today), "D--3");
  assert.equal(formatHomeAssignmentDueDate(undefined, "ios", today), "기한없음");
});
