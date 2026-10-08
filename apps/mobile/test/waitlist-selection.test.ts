import assert from "node:assert/strict";
import test from "node:test";
import {
  clearProcessedWaitlistSelection,
  toggleWaitlistSelection,
  waitlistSelectionBatch,
  waitlistSelectionCount,
  type WaitlistSelection,
} from "../src/utils/waitlistSelection.ts";

test("selections persist independently across teacher and student tabs", () => {
  const empty: WaitlistSelection = { STUDENT: [], TEACHER: [] };
  const withTeacher = toggleWaitlistSelection(empty, "TEACHER", "teacher-1");
  const withBothRoles = toggleWaitlistSelection(withTeacher, "STUDENT", "student-1");

  assert.deepEqual(withBothRoles, {
    STUDENT: ["student-1"],
    TEACHER: ["teacher-1"],
  });
  assert.equal(waitlistSelectionCount(["TEACHER", "STUDENT"], withBothRoles), 2);
  assert.deepEqual(waitlistSelectionBatch(["TEACHER", "STUDENT"], withBothRoles), [
    ["TEACHER", ["teacher-1"]],
    ["STUDENT", ["student-1"]],
  ]);
});

test("batch excludes empty role lists and toggling one role keeps the other intact", () => {
  const selection: WaitlistSelection = { STUDENT: ["student-1"], TEACHER: [] };
  assert.deepEqual(waitlistSelectionBatch(["TEACHER", "STUDENT"], selection), [
    ["STUDENT", ["student-1"]],
  ]);
  assert.deepEqual(toggleWaitlistSelection(selection, "TEACHER", "teacher-1"), {
    STUDENT: ["student-1"],
    TEACHER: ["teacher-1"],
  });
});

test("partial batch success clears processed members but retains failed-role selections", () => {
  const selection: WaitlistSelection = {
    STUDENT: ["student-1", "student-2"],
    TEACHER: ["teacher-1"],
  };

  assert.deepEqual(clearProcessedWaitlistSelection(selection, { STUDENT: ["student-1"] }), {
    STUDENT: ["student-2"],
    TEACHER: ["teacher-1"],
  });
});
