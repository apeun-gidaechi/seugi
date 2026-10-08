/** iOS meal widget: mirrors upstream `MealType.from` in seugi-ios. */
export function iosMealWidgetPeriod(now: Date): {
  type: "조식" | "중식" | "석식";
  label: "아침" | "점심" | "저녁";
} {
  const hour = now.getHours();
  const minute = now.getMinutes();

  if (hour <= 8) {
    return { type: "조식", label: "아침" };
  }
  if ((hour >= 9 && hour <= 12) || (hour === 13 && minute < 30)) {
    return { type: "중식", label: "점심" };
  }
  if ((hour === 13 && minute <= 30) || (hour >= 14 && hour <= 19) || (hour === 19 && minute < 10)) {
    return { type: "석식", label: "저녁" };
  }
  return { type: "조식", label: "아침" };
}
