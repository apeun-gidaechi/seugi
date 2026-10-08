export function isMealCalendarDateActive(date: string, today: string, platform: "android" | "ios") {
  return platform === "ios" || date <= today;
}
