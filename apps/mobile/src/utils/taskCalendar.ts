import { localDateKey } from "./date.ts";

/** Build the Sunday-first calendar slots used by the Android task date picker. */
export function taskCalendarSlots(year: number, month: number): Array<string | undefined> {
  const firstWeekday = new Date(year, month, 1).getDay();
  const dayCount = new Date(year, month + 1, 0).getDate();
  const rows = dayCount === 30 && firstWeekday === 6
    || dayCount === 31 && firstWeekday >= 5
    ? 6
    : dayCount === 28 && firstWeekday === 0
      ? 4
      : 5;
  const dates = Array.from({ length: dayCount }, (_, index) =>
    localDateKey(new Date(year, month, index + 1)),
  );
  return [
    ...Array<string | undefined>(firstWeekday).fill(undefined),
    ...dates,
    ...Array<string | undefined>(rows * 7 - firstWeekday - dayCount).fill(undefined),
  ];
}

export function isTaskDateSelectable(date: string, today: string): boolean {
  return date >= today;
}

export function finishTaskDatePicker(
  currentDueDate: string,
  draftDate: string,
  today: string,
  confirmed: boolean,
) {
  return {
    dueDate: confirmed ? draftDate : currentDueDate,
    selectedDate: today,
  };
}
