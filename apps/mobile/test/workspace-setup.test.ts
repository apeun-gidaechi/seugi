import assert from "node:assert/strict";
import test from "node:test";
import {
  workspaceNameValidationMessage,
  workspaceRequestRoles,
} from "../src/utils/workspaceSetup.ts";
import { roundedCircleImageMetrics } from "../src/utils/roundedCircleImage.ts";

test("workspace name validation uses school-specific native copy", () => {
  assert.equal(workspaceNameValidationMessage(), "학교 이름을 입력해 주세요");
});

test("medium rounded workspace image dimensions match native Android and iOS", () => {
  assert.deepEqual(roundedCircleImageMetrics("android", "medium"), {
    dimension: 128,
    radius: 36,
    borderWidth: 1,
    iconDimension: 64,
  });
  assert.deepEqual(roundedCircleImageMetrics("ios", "medium"), {
    dimension: 128,
    radius: (128 * 16) / 45,
    borderWidth: 2,
    iconDimension: (128 * 5) / 9,
  });
});

test("all rounded image sizes preserve the native corner radii", () => {
  assert.equal(roundedCircleImageMetrics("android", "large").radius, 64);
  assert.equal(roundedCircleImageMetrics("android", "small").radius, 18);
  assert.equal(roundedCircleImageMetrics("android", "extraSmall").radius, 13.5);
  assert.equal(roundedCircleImageMetrics("ios", "large").radius, 64);
  assert.equal(roundedCircleImageMetrics("ios", "small").radius, (64 * 16) / 45);
  assert.equal(roundedCircleImageMetrics("ios", "extraSmall").radius, (48 * 16) / 45);
});

test("pending workspace cancellation preserves teacher and student application roles", () => {
  assert.deepEqual(workspaceRequestRoles(["TEACHER"]), ["TEACHER"]);
  assert.deepEqual(workspaceRequestRoles(["STUDENT", "TEACHER"]), ["STUDENT", "TEACHER"]);
  assert.deepEqual(workspaceRequestRoles(), ["STUDENT"]);
});
