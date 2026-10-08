import assert from "node:assert/strict";
import test from "node:test";
import {
  finishTaskDatePicker,
  isTaskDateSelectable,
  taskCalendarSlots,
} from "../src/utils/taskCalendar.ts";

test("task calendar fills a complete Sunday-first four-row February", () => {
  const slots = taskCalendarSlots(2026, 1);
  assert.equal(slots.length, 28);
  assert.equal(slots[0], "2026-02-01");
  assert.equal(slots.at(-1), "2026-02-28");
});

test("task calendar uses six rows when a 31-day month starts on Friday", () => {
  const slots = taskCalendarSlots(2026, 4);
  assert.equal(slots.length, 42);
  assert.equal(slots[5], "2026-05-01");
  assert.equal(slots[35], "2026-05-31");
  assert.equal(slots[36], undefined);
});

test("task calendar pads trailing weekdays for a five-row month", () => {
  const slots = taskCalendarSlots(2026, 10);
  assert.equal(slots.length, 35);
  assert.equal(slots[0], "2026-11-01");
  assert.equal(slots[29], "2026-11-30");
  assert.equal(slots[34], undefined);
});

test("task date picker considers today valid but rejects earlier dates", () => {
  assert.equal(isTaskDateSelectable("2026-10-07", "2026-10-08"), false);
  assert.equal(isTaskDateSelectable("2026-10-08", "2026-10-08"), true);
  assert.equal(isTaskDateSelectable("2026-10-09", "2026-10-08"), true);
});

test("task date picker resets its highlighted day to today after confirming a due date", () => {
  assert.deepEqual(finishTaskDatePicker("2026-10-08", "2026-10-20", "2026-10-08", true), {
    dueDate: "2026-10-20",
    selectedDate: "2026-10-08",
  });
});

test("task date picker discards the draft and resets its highlight after dismissal", () => {
  assert.deepEqual(finishTaskDatePicker("2026-10-20", "2026-10-28", "2026-10-08", false), {
    dueDate: "2026-10-20",
    selectedDate: "2026-10-08",
  });
});
