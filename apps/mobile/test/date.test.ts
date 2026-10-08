import assert from "node:assert/strict";
import test from "node:test";
import { timetableWeekRangeLabel } from "../src/utils/date.ts";

test("timetable week header follows each native platform's range and format", () => {
  const wednesday = new Date(2026, 5, 3);
  assert.equal(timetableWeekRangeLabel(wednesday, "ios"), "06/01 ~ 06/05");
  assert.equal(timetableWeekRangeLabel(wednesday, "android"), "6/1~6/7");
});

test("timetable week range formats month and year boundaries", () => {
  const wednesday = new Date(2026, 11, 30);
  assert.equal(timetableWeekRangeLabel(wednesday, "ios"), "12/28 ~ 01/01");
  assert.equal(timetableWeekRangeLabel(wednesday, "android"), "12/28~1/3");
});
