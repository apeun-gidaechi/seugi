import assert from "node:assert/strict";
import test from "node:test";
import { isMealCalendarDateActive } from "../src/utils/mealCalendar.ts";

test("Android dims future meal dates but leaves them selectable, matching native callback handling", () => {
  assert.equal(isMealCalendarDateActive("2026-10-07", "2026-10-08", "android"), true);
  assert.equal(isMealCalendarDateActive("2026-10-08", "2026-10-08", "android"), true);
  assert.equal(isMealCalendarDateActive("2026-10-09", "2026-10-08", "android"), false);
});

test("iOS meal calendar does not dim dates based on today", () => {
  assert.equal(isMealCalendarDateActive("2026-10-09", "2026-10-08", "ios"), true);
});
