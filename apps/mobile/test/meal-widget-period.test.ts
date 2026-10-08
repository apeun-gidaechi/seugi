import assert from "node:assert/strict";
import test from "node:test";
import { androidMealWidgetPeriod } from "../src/utils/mealWidgetPeriod.ts";

test("Android meal widget follows native 08:10 and 13:30 cutoffs", () => {
  assert.deepEqual(androidMealWidgetPeriod(new Date(2026, 0, 1, 8, 9)), { type: "조식", label: "아침" });
  assert.deepEqual(androidMealWidgetPeriod(new Date(2026, 0, 1, 8, 10)), { type: "중식", label: "점심" });
  assert.deepEqual(androidMealWidgetPeriod(new Date(2026, 0, 1, 13, 29)), { type: "중식", label: "점심" });
  assert.deepEqual(androidMealWidgetPeriod(new Date(2026, 0, 1, 13, 30)), { type: "석식", label: "저녁" });
});
