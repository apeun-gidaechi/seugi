import assert from "node:assert/strict";
import test from "node:test";
import { notificationTokenAction } from "../src/utils/notificationTokenAction.ts";

test("enabling pushes reuses a known token or requests one only when configured", () => {
  assert.equal(notificationTokenAction(true, "expo-token", true), "register");
  assert.equal(notificationTokenAction(true, undefined, true), "request-and-register");
  assert.equal(notificationTokenAction(true, undefined, false), "none");
});

test("disabling pushes never requests a new token", () => {
  assert.equal(notificationTokenAction(false, "expo-token", true), "remove");
  assert.equal(notificationTokenAction(false, undefined, true), "none");
});
