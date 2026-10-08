import assert from "node:assert/strict";
import test from "node:test";
import { workspaceMembersLoadFailureState } from "../src/utils/workspaceMembersLoad.ts";

test("Android keeps the native loading rows visible after the initial member request fails", () => {
  assert.deepEqual(workspaceMembersLoadFailureState("android", false), {
    loading: true,
    loadFailed: false,
  });
  assert.deepEqual(workspaceMembersLoadFailureState("android", true), {
    loading: false,
    loadFailed: false,
  });
});

test("iOS replaces the member list with its native failure empty state", () => {
  assert.deepEqual(workspaceMembersLoadFailureState("ios", false), {
    loading: false,
    loadFailed: true,
  });
});
