import { useEffect, useState } from "react";
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { Meal, Workspace } from "@seugi/contracts";
import { api } from "../services/api";
import { localDateKey } from "../utils/date";
import { isMealCalendarDateActive } from "../utils/mealCalendar";
import { SeugiShimmer } from "../design-system/Shimmer";
import { nativePlatform } from "../utils/platform";

const MEAL_PRIORITY: Record<string, number> = { 조식: 0, 중식: 1, 석식: 2 };

export function MealCalendar({ workspace }: { workspace: Workspace }) {
  const [month] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()));
  const [meals, setMeals] = useState<Meal[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const year = month.getFullYear();
  const monthNumber = month.getMonth() + 1;

  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    api
      .meals(workspace.id, year, monthNumber)
      .then((result) => {
        if (!active) return;
        setMeals(result.data ?? []);
        setBusy(false);
      })
      .catch((reason) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "급식을 불러오지 못했습니다");
        // Keep the Android loading placeholders visible on request failure, as the
        // native MealViewModel leaves isLoading unchanged for Result.Error.
        // iOS has no loading state and falls through to its normal empty-day text.
        if (Platform.OS === "ios") setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [workspace.id, year, monthNumber]);

  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  // The native iOS and Android date pickers use a Sunday-first calendar.
  const leadingBlanks = new Date(year, monthNumber - 1, 1).getDay();
  const trailingBlanks = (7 - ((leadingBlanks + daysInMonth) % 7)) % 7;
  const today = localDateKey(new Date());
  const slots: Array<string | undefined> = [
    ...Array(leadingBlanks).fill(undefined),
    ...Array.from(
      { length: daysInMonth },
      (_, index) =>
        `${year}-${String(monthNumber).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
    ),
    ...Array(trailingBlanks).fill(undefined),
  ];
  const selectedMeals = meals
    .filter((meal) => meal.date.slice(0, 10) === selectedDate)
    .sort(
      (a, b) =>
        (MEAL_PRIORITY[a.type] ?? Number.MAX_SAFE_INTEGER) -
        (MEAL_PRIORITY[b.type] ?? Number.MAX_SAFE_INTEGER),
    );
  return (
    <FlatList
      style={styles.content}
      data={selectedMeals.length ? [selectedMeals] : []}
      keyExtractor={() => selectedDate}
      ListHeaderComponent={
        <View style={styles.calendar}>
          <View style={styles.weekdays}>
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <Text key={day} style={styles.weekday}>
                {day}
              </Text>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {slots.map((date, index) => {
              if (!date) return <View key={`empty-${index}`} style={styles.emptyDay} />;
              const active = isMealCalendarDateActive(date, today, nativePlatform());
              return (
                <TouchableOpacity
                  key={date}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedDate === date }}
                  onPress={() => setSelectedDate(date)}
                  style={styles.day}
                >
                  {selectedDate === date ? (
                    <View
                      pointerEvents="none"
                      style={[
                        styles.selectedDayIndicator,
                        Platform.OS === "android" && styles.androidSelectedDayIndicator,
                      ]}
                    />
                  ) : null}
                  <Text
                    style={[
                      styles.dayNumber,
                      !active && styles.futureDayNumber,
                      selectedDate === date && styles.selectedDayNumber,
                    ]}
                  >
                    {Number(date.slice(-2))}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      }
      ListEmptyComponent={<EmptyMealState busy={busy} error={error} />}
      renderItem={({ item: dayMeals }) => (
        <View style={Platform.OS === "android" ? styles.androidMealPanel : styles.iosMealPanel}>
          {dayMeals.map((meal, mealIndex) => (
            <View
              key={`${meal.date}-${meal.type}`}
              style={mealIndex ? styles.mealSection : undefined}
            >
              <View style={styles.mealHeading}>
                <Text style={styles.mealType}>
                  {Platform.OS === "android"
                    ? ({ 조식: "아침", 중식: "점심", 석식: "저녁" }[meal.type] ?? meal.type)
                    : meal.type}
                </Text>
                {meal.calorie ? <Text style={styles.muted}>{meal.calorie}</Text> : null}
              </View>
              {meal.menu.map((dish, index) => (
                <Text key={`${index}-${dish}`}>{dish}</Text>
              ))}
            </View>
          ))}
        </View>
      )}
    />
  );
}

function EmptyMealState({ busy, error }: { busy: boolean; error: string }) {
  if (Platform.OS === "android") {
    return (
      <View style={styles.androidEmptyPanel}>
        {busy ? (
          Array.from({ length: 3 }, (_, index) => (
            <View key={index} style={styles.skeletonMeal}>
              <View style={styles.skeletonHeading}>
                <SeugiShimmer style={styles.skeletonCategory} />
                <SeugiShimmer style={styles.skeletonCalorie} />
              </View>
              {Array.from({ length: 5 }, (_, line) => (
                <SeugiShimmer key={line} style={styles.skeletonMenuLine} />
              ))}
            </View>
          ))
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : null}
      </View>
    );
  }
  return <Text style={styles.muted}>급식이 없어요</Text>;
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: Platform.OS === "android" ? SeugiColor.Primary050 : SeugiColor.White,
  },
  muted: { color: SeugiColor.Gray500, fontSize: 12, textAlign: "center", paddingVertical: 12 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  calendar: { paddingTop: 12, paddingHorizontal: 16 },
  weekdays: { flexDirection: "row" },
  weekday: {
    width: "14.28%",
    height: 18,
    textAlign: "center",
    textAlignVertical: "center",
    color: SeugiColor.Gray600,
    fontSize: 14,
  },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  day: {
    width: "14.28%",
    minHeight: Platform.OS === "android" ? 34 : 38,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedDayIndicator: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: SeugiColor.Primary500,
  },
  androidSelectedDayIndicator: { width: 38, height: 38, borderRadius: 10, top: -8 },
  dayNumber: { color: SeugiColor.Gray600, fontSize: 16, fontWeight: "600", zIndex: 1 },
  futureDayNumber: { color: `${SeugiColor.Gray600}80` },
  selectedDayNumber: { color: SeugiColor.White, fontWeight: "700" },
  emptyDay: { width: "14.28%", minHeight: Platform.OS === "android" ? 34 : 38 },
  androidMealPanel: {
    flex: 1,
    minHeight: 220,
    backgroundColor: SeugiColor.White,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 16,
    marginTop: 16,
  },
  androidEmptyPanel: {
    flex: 1,
    minHeight: 220,
    backgroundColor: SeugiColor.White,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 16,
    marginTop: 16,
  },
  iosMealPanel: { paddingHorizontal: 16, paddingBottom: 16 },
  skeletonMeal: { gap: 8, paddingVertical: 16 },
  skeletonHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  skeletonCategory: { width: 28, height: 21, borderRadius: 11 },
  skeletonCalorie: { width: 51, height: 18, borderRadius: 9 },
  skeletonMenuLine: { width: 120, height: 18, borderRadius: 9 },
  mealSection: {
    borderTopWidth: 1,
    borderTopColor: SeugiColor.Gray100,
    marginTop: 12,
    paddingTop: 12,
  },
  mealHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  mealType: { color: SeugiColor.Gray800, fontSize: 16, fontWeight: "600" },
});
