import assert from "node:assert/strict";
import test from "node:test";
import { shouldShowTextFieldClearButton } from "../src/utils/textField.ts";

const base = { hasCustomClearAction: false, hasValue: true, editable: true };

test("Android text fields only show a clear action when the native call site requested one", () => {
  assert.equal(shouldShowTextFieldClearButton({ ...base, platform: "android" }), false);
  assert.equal(
    shouldShowTextFieldClearButton({ ...base, platform: "android", clearable: true }),
    true,
  );
  assert.equal(
    shouldShowTextFieldClearButton({ ...base, platform: "android", hasCustomClearAction: true }),
    true,
  );
});

test("iOS text fields clear by default while explicit settings and field state take precedence", () => {
  assert.equal(shouldShowTextFieldClearButton({ ...base, platform: "ios" }), true);
  assert.equal(
    shouldShowTextFieldClearButton({ ...base, platform: "ios", clearable: false }),
    false,
  );
  assert.equal(
    shouldShowTextFieldClearButton({ ...base, platform: "ios", hasValue: false }),
    false,
  );
  assert.equal(
    shouldShowTextFieldClearButton({ ...base, platform: "ios", editable: false }),
    false,
  );
});
