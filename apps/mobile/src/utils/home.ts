export function initialHomeMealPage(now: Date, platform: "ios" | "android") {
  if (platform === "ios") return 0;
  const minuteOfDay = now.getHours() * 60 + now.getMinutes();
  if (minuteOfDay <= 8 * 60 + 20) return 0;
  if (minuteOfDay <= 13 * 60 + 30) return 1;
  return 2;
}

export function shouldLoadClassroomTasks(platform: string) {
  return platform === "android";
}
