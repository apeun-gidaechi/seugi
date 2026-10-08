import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import { SeugiChevronLeft, SeugiChevronRight } from "../design-system/NativeIndicators";
import type { Timetable, Workspace } from "@seugi/contracts";
import { api } from "../services/api";
import { localDateKey, timetableWeekRangeLabel } from "../utils/date";

export function TimetableWeek({ entries }: { entries: Timetable[] }) {
  const today = new Date();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  const days = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return localDateKey(date);
  });
  const periods = [...new Set(entries.map((entry) => entry.time))].sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));
  const subjectAt = (date: string, period: string) => entries.find((entry) => entry.date.slice(0, 10) === date && entry.time === period)?.subject ?? "";
  const rowStyle = { flexDirection: "row" as const };
  const bodyRowStyle = { ...rowStyle, flex: 1 as const };
  const periodStyle = { width: 24, borderWidth: 1, borderColor: SeugiColor.Gray100, fontSize: 12, textAlign: "center" as const, textAlignVertical: "center" as const };
  const cellStyle = { flex: 1, minWidth: 0, paddingHorizontal: 1, borderWidth: 1, borderColor: SeugiColor.Gray100, fontSize: 14, textAlign: "center" as const, textAlignVertical: "center" as const };
  const headStyle = { height: 24, paddingVertical: 0, fontSize: 12, fontWeight: "400" as const, color: SeugiColor.Gray500, textAlignVertical: "center" as const };
  return (
    <View style={Platform.OS === "ios" ? styles.iosTimetableShadow : styles.timetableGrid}>
      <View style={Platform.OS === "ios" ? styles.iosTimetableGrid : styles.timetableGrid}>
        <View style={rowStyle}>
          <View style={[periodStyle, headStyle]} />
          {days.map((date, index) => <Text key={date} style={[cellStyle, headStyle]}>{["월", "화", "수", "목", "금"][index]}</Text>)}
        </View>
        {periods.map((period) => (
          <View key={period} style={bodyRowStyle}>
            <Text style={periodStyle}>{period}</Text>
            {days.map((date) => <Text key={`${date}-${period}`} numberOfLines={2} style={cellStyle}>{subjectAt(date, period)}</Text>)}
          </View>
        ))}
      </View>
    </View>
  );
}

export function TimetablePage({ workspace }: { workspace: Workspace }) {
  const [entries, setEntries] = useState<Timetable[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.weeklyTimetable(workspace.id);
      setEntries(result.data ?? []);
    } catch { setEntries([]); }
    finally { setLoading(false); }
  }, [workspace.id]);
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 250);
    return () => clearTimeout(timer);
  }, [refresh]);
  return (
    <View style={styles.content}>
      <View style={styles.dateRange}>{Platform.OS === "ios" ? <SeugiChevronLeft /> : <View style={styles.rangeArrowSpacer} />}<Text style={styles.rangeText}>{timetableWeekRangeLabel(new Date(), Platform.OS === "ios" ? "ios" : "android")}</Text>{Platform.OS === "ios" ? <SeugiChevronRight /> : <View style={styles.rangeArrowSpacer} />}</View>
      {loading && Platform.OS === "ios" ? <ActivityIndicator style={styles.loading} color={SeugiColor.Primary500} /> : <TimetableWeek entries={entries} />}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 16 },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
  dateRange: { minHeight: 48, marginBottom: 8, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: SeugiColor.White, borderRadius: 12, shadowColor: SeugiColor.Black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  rangeText: { color: SeugiColor.Black, fontSize: 16, fontWeight: "600" },
  rangeArrowSpacer: { width: 24 },
  loading: { flex: 1 },
  timetableGrid: { flex: 1 },
  iosTimetableShadow: { flex: 1, backgroundColor: SeugiColor.White, borderRadius: 12, shadowColor: SeugiColor.Black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  iosTimetableGrid: { flex: 1, backgroundColor: SeugiColor.White, borderRadius: 12, overflow: "hidden" },
});
