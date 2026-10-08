import type { Store } from "./store.js";

/** Clear the same cached rows removed by the original monthly meal job. */
export function clearMonthlyMealCache(store: Store) {
  return store.withMutation(() => store.meals.clear());
}

/** Clear the same cached rows removed by the original weekly timetable job. */
export function clearWeeklyTimetableCache(store: Store) {
  return store.withMutation(() => store.timetables.clear());
}

export function nextLocalMonthBoundary(now: Date) {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

export function nextLocalSundayBoundary(now: Date) {
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday);
}

/**
 * Mirrors the original service's first-of-month and Sunday-midnight cache
 * invalidation. Data is fetched again lazily on the next authenticated read.
 */
export class SchoolDataResetScheduler {
  private mealTimer?: ReturnType<typeof setTimeout>;
  private timetableTimer?: ReturnType<typeof setTimeout>;
  private stopped = true;

  constructor(
    private readonly store: Store,
    private readonly onError: (error: unknown, message: string) => void = () => undefined,
  ) {}

  start() {
    if (!this.stopped) return;
    this.stopped = false;
    this.scheduleMealReset();
    this.scheduleTimetableReset();
  }

  stop() {
    this.stopped = true;
    if (this.mealTimer) clearTimeout(this.mealTimer);
    if (this.timetableTimer) clearTimeout(this.timetableTimer);
    this.mealTimer = undefined;
    this.timetableTimer = undefined;
  }

  private scheduleMealReset() {
    const delay = nextLocalMonthBoundary(new Date()).getTime() - Date.now();
    this.mealTimer = setTimeout(() => {
      void clearMonthlyMealCache(this.store)
        .catch((error) => this.onError(error, "Scheduled meal cache reset failed"))
        .finally(() => {
          this.mealTimer = undefined;
          if (!this.stopped) this.scheduleMealReset();
        });
    }, Math.max(1, delay));
    this.mealTimer.unref?.();
  }

  private scheduleTimetableReset() {
    const delay = nextLocalSundayBoundary(new Date()).getTime() - Date.now();
    this.timetableTimer = setTimeout(() => {
      void clearWeeklyTimetableCache(this.store)
        .catch((error) => this.onError(error, "Scheduled timetable cache reset failed"))
        .finally(() => {
          this.timetableTimer = undefined;
          if (!this.stopped) this.scheduleTimetableReset();
        });
    }, Math.max(1, delay));
    this.timetableTimer.unref?.();
  }
}
