import assert from "node:assert/strict";
import test from "node:test";
import { localDateString, schoolWeekRange } from "../src/school/dates.js";

test("localDateString zero-pads month and day", () => {
  assert.equal(localDateString(new Date(2026, 0, 5)), "2026-01-05");
});

test("schoolWeekRange spans Monday through Sunday", () => {
  const wednesday = new Date(2026, 9, 8);
  const [from, to] = schoolWeekRange(wednesday);
  assert.equal(from, "2026-10-05");
  assert.equal(to, "2026-10-11");
});
