import assert from "node:assert/strict";
import test from "node:test";
import { homeNotificationRequest } from "../src/utils/homeNotifications.ts";

test("home requests the full native notice batch for client-side pagination", () => {
  assert.deepEqual(homeNotificationRequest(0), { page: 0, size: 365 });
  assert.deepEqual(homeNotificationRequest(2), { page: 2, size: 365 });
});
