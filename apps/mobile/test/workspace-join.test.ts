import assert from "node:assert/strict";
import test from "node:test";
import { joinWorkspaceThenShowWaiting } from "../src/utils/workspaceJoin.ts";

test("successful join shows approval-waiting even if refreshing workspace state fails", async () => {
  const events: string[] = [];
  await joinWorkspaceThenShowWaiting(
    async () => { events.push("submitted"); },
    () => { events.push("waiting"); },
    async () => { events.push("refresh"); throw new Error("temporary refresh failure"); },
  );
  assert.deepEqual(events, ["submitted", "waiting", "refresh"]);
});

test("failed join does not navigate to the waiting screen or refresh", async () => {
  const events: string[] = [];
  await assert.rejects(() => joinWorkspaceThenShowWaiting(
    async () => { events.push("submitted"); throw new Error("join denied"); },
    () => { events.push("waiting"); },
    async () => { events.push("refresh"); },
  ), /join denied/);
  assert.deepEqual(events, ["submitted"]);
});
