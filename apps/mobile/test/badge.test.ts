import assert from "node:assert/strict";
import test from "node:test";
import { formatBadgeCount } from "../src/utils/badge.ts";

test("count badges keep the original Android and iOS 300 cutoff", () => {
  assert.equal(formatBadgeCount(299, "android"), "299");
  assert.equal(formatBadgeCount(300, "android"), "300");
  assert.equal(formatBadgeCount(301, "android"), "300+");
  assert.equal(formatBadgeCount(299, "ios"), "299");
  assert.equal(formatBadgeCount(300, "ios"), "300+");
});
