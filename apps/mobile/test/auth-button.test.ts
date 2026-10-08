import assert from "node:assert/strict";
import test from "node:test";
import { authPrimaryButtonProps, authPrimaryButtonSize } from "../src/utils/authButton.ts";

test("auth primary buttons use large full-width CTAs on iOS and compact ones on Android", () => {
  assert.equal(authPrimaryButtonSize("ios"), "large");
  assert.equal(authPrimaryButtonSize("android"), "small");
  assert.deepEqual(authPrimaryButtonProps("ios"), { size: "large", fullWidth: true });
  assert.deepEqual(authPrimaryButtonProps("android"), { size: "small", fullWidth: true });
});
