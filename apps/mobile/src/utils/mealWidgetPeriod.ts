/** Android meal widget: native `MealWidget` uses 08:10 and 13:30 cutoffs (not home carousel 08:20). */
export function androidMealWidgetPeriod(now: Date) {
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes < 8 * 60 + 10) return { type: "조식", label: "아침" };
  if (minutes < 13 * 60 + 30) return { type: "중식", label: "점심" };
  return { type: "석식", label: "저녁" };
}
