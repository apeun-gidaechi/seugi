export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function timetableWeekRangeLabel(today: Date, platform: "ios" | "android") {
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  const rangeEnd = new Date(monday);
  rangeEnd.setDate(monday.getDate() + (platform === "ios" ? 4 : 6));
  if (platform === "android") {
    return `${monday.getMonth() + 1}/${monday.getDate()}~${rangeEnd.getMonth() + 1}/${rangeEnd.getDate()}`;
  }
  const format = (date: Date) => `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
  return `${format(monday)} ~ ${format(rangeEnd)}`;
}
