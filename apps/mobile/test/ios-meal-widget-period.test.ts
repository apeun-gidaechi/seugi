import assert from "node:assert/strict";
import test from "node:test";
import { iosMealWidgetPeriod } from "../src/utils/iosMealWidgetPeriod.ts";

test("iOS meal widget period matches native MealType.from cutoffs", () => {
  assert.deepEqual(iosMealWidgetPeriod(new Date(2026, 0, 1, 8, 59)), { type: "조식", label: "아침" });
  assert.deepEqual(iosMealWidgetPeriod(new Date(2026, 0, 1, 9, 0)), { type: "중식", label: "점심" });
  assert.deepEqual(iosMealWidgetPeriod(new Date(2026, 0, 1, 13, 29)), { type: "중식", label: "점심" });
  assert.deepEqual(iosMealWidgetPeriod(new Date(2026, 0, 1, 13, 30)), { type: "석식", label: "저녁" });
});
