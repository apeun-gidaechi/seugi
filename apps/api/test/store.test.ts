import assert from "node:assert/strict";
import test from "node:test";
import { Store, type StoreSnapshot } from "../src/store.js";

test("Store migrates legacy single-role waitlist snapshots and keeps role arrays", () => {
  const snapshot: StoreSnapshot = {
    members: [],
    profiles: [],
    workspaces: [],
    rooms: [],
    messages: [],
    notifications: [],
    timetables: [],
    tasks: [],
    schedules: [],
    meals: [],
    emailCodes: [],
    oauth: [],
    deviceTokens: [],
    waitlistRoles: [
      ["legacy-workspace:legacy-member", "STUDENT"],
      ["new-workspace:new-member", ["STUDENT", "TEACHER"]],
    ],
    workspacePushPreferences: [],
  };
  const store = new Store();
  store.restore(snapshot);

  assert.deepEqual(store.waitlistRoles.get("legacy-workspace:legacy-member"), ["STUDENT"]);
  assert.deepEqual(store.waitlistRoles.get("new-workspace:new-member"), ["STUDENT", "TEACHER"]);
  assert.deepEqual(store.snapshot().waitlistRoles, [
    ["legacy-workspace:legacy-member", ["STUDENT"]],
    ["new-workspace:new-member", ["STUDENT", "TEACHER"]],
  ]);
});
