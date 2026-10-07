import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type {
  ClassroomTask,
  Meal,
  Schedule,
  Task,
  Timetable,
  Workspace,
} from "@seugi/contracts";
import { Button, Card } from "../components/ui";
import { api } from "../services/api";
import { localDateKey } from "../utils/date";

export type HomeDetail = "meals" | "timetable" | "tasks" | "catSeugi" | "workspace";

export function HomeScreen({
  workspace,
  onOpenCatSeugi,
  onOpenMeals,
  onOpenTimetable,
  onOpenTasks,
  onOpenWorkspace,
}: {
  workspace: Workspace;
  onOpenCatSeugi: () => void;
  onOpenMeals: () => void;
  onOpenTimetable: () => void;
  onOpenTasks: () => void;
  onOpenWorkspace: () => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [classroomTasks, setClassroomTasks] = useState<ClassroomTask[]>([]);
  const [timetable, setTimetable] = useState<Timetable[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const refreshTasks = useCallback(async () => {
    const result = await api.tasks(workspace.id);
    setTasks(result.data ?? []);
  }, [workspace.id]);
  useEffect(() => {
    refreshTasks().catch(() => undefined);
    api
      .classroomTasks()
      .then((result) => setClassroomTasks(result.data ?? []))
      .catch(() => setClassroomTasks([]));
    api
      .weeklyTimetable(workspace.id)
      .then((result) => setTimetable(result.data ?? []))
      .catch(() => undefined);
    api
      .meals(workspace.id)
      .then((result) => setMeals(result.data ?? []))
      .catch(() => undefined);
    api
      .schedules(workspace.id)
      .then((result) => setSchedules(result.data ?? []))
      .catch(() => undefined);
  }, [workspace.id, refreshTasks]);

  const today = localDateKey(new Date());
  const todaysMeals = meals.filter((item) => item.date.slice(0, 10) === today);
  const todaysTimetable = timetable
    .filter((item) => item.date.slice(0, 10) === today)
    .sort((a, b) => Number(a.time) - Number(b.time));
  const upcoming = schedules
    .filter((item) => item.date.slice(0, 10) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return (
    <ScrollView style={styles.content}>
      <Card title="내 학교">
        <View style={styles.schoolRow}>
          <Text style={styles.rowTitle}>{workspace.name}</Text>
          <Button label="학교 관리" kind="secondary" onPress={onOpenWorkspace} />
        </View>
      </Card>
      <Card title="오늘의 시간표" onPress={onOpenTimetable}>
        {todaysTimetable.length ? (
          todaysTimetable.map((item) => (
            <View key={item.id} style={styles.homeRow}>
              <Text style={styles.muted}>{item.time}교시</Text>
              <Text style={styles.rowTitle}>{item.subject}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>학교를 등록하고 시간표를 확인하세요</Text>
        )}
      </Card>
      <Card title="오늘의 급식" onPress={onOpenMeals}>
        {todaysMeals.length ? (
          todaysMeals.map((meal) => (
            <View key={`${meal.date}-${meal.type}`}>
              <Text style={styles.rowTitle}>
                {meal.type}
                {meal.calorie ? ` · ${meal.calorie}` : ""}
              </Text>
              <Text>{meal.menu.join(" · ")}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.muted}>오늘 등록된 급식 정보가 없습니다.</Text>
        )}
      </Card>
      <Card title="캣스기">
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onOpenCatSeugi}
          style={styles.catPrompt}
        >
          <Text style={styles.muted}>2학년 4반에서 아무나 한명 뽑아줘...</Text>
          <Text style={styles.link}>⌕</Text>
        </TouchableOpacity>
      </Card>
      <Card title="다가오는 일정">
        {upcoming.length ? (
          upcoming.map((item) => (
            <Text key={`${item.date}-${item.name}`}>
              {item.date.slice(0, 10)} · {item.name}
            </Text>
          ))
        ) : (
          <Text style={styles.muted}>학교를 등록하고 일정을 확인하세요</Text>
        )}
      </Card>
      <Card title="다가오는 과제" onPress={onOpenTasks}>
        {classroomTasks.length || tasks.length ? (
          [...classroomTasks, ...tasks]
            .filter((item) => !item.dueDate || item.dueDate.slice(0, 10) >= today)
            .slice(0, 3)
            .map((item, index) => (
            <View key={`${"link" in item ? "classroom" : "task"}-${item.id}-${index}`}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              <Text style={styles.muted}>
                {item.dueDate
                  ? `마감 ${new Date(item.dueDate).toLocaleDateString()}`
                  : "기한없음"}
              </Text>
              {"link" in item && item.link ? (
                <TouchableOpacity onPress={() => Linking.openURL(item.link!).catch(() => undefined)}>
                  <Text style={styles.link}>과제 열기 ↗</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={styles.muted}>학교를 등록하고 과제를 확인하세요</Text>
        )}
      </Card>
    </ScrollView>
  );
}

export { HomeScreen as Home };

export function TimetableWeek({ entries }: { entries: Timetable[] }) {
  const today = new Date();
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - ((today.getDay() + 6) % 7),
  );
  const days = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return localDateKey(date);
  });
  const periods = [...new Set(entries.map((entry) => entry.time))].sort(
    (a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10),
  );
  const weekLabel = `${days[0].slice(5).replace("-", "/")}–${days[4].slice(5).replace("-", "/")}`;
  const subjectAt = (date: string, period: string) =>
    entries.find(
      (entry) => entry.date.slice(0, 10) === date && entry.time === period,
    )?.subject ?? "";
  const rowStyle = { flexDirection: "row" as const };
  const periodStyle = {
    width: 32,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: SeugiColor.Gray300,
    fontSize: 11,
    textAlign: "center" as const,
  };
  const cellStyle = {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 1,
    borderWidth: 1,
    borderColor: SeugiColor.Gray300,
    fontSize: 10,
    textAlign: "center" as const,
  };
  const headStyle = {
    fontWeight: "700" as const,
    backgroundColor: SeugiColor.Primary050,
  };
  return (
    <View>
      <Text style={styles.muted}>{weekLabel} · 월–금</Text>
      <View style={rowStyle}>
        <Text style={[periodStyle, headStyle]}>교시</Text>
        {days.map((date, index) => (
          <Text key={date} style={[cellStyle, headStyle]}>
            {["월", "화", "수", "목", "금"][index]}
          </Text>
        ))}
      </View>
      {periods.length ? (
        periods.map((period) => (
          <View key={period} style={rowStyle}>
            <Text style={periodStyle}>{period}</Text>
            {days.map((date) => (
              <Text
                key={`${date}-${period}`}
                style={cellStyle}
                numberOfLines={2}
              >
                {subjectAt(date, period)}
              </Text>
            ))}
          </View>
        ))
      ) : (
        <Text style={styles.muted}>이번 주 시간표가 없습니다.</Text>
      )}
    </View>
  );
}

export function TimetablePage({ workspace }: { workspace: Workspace }) {
  const [entries, setEntries] = useState<Timetable[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const result = await api.weeklyTimetable(workspace.id);
      setEntries(result.data ?? []);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "시간표를 불러오지 못했습니다",
      );
    } finally {
      setBusy(false);
    }
  }, [workspace.id]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return (
    <ScrollView style={styles.content}>
      <Card title="주간 시간표">
        <Text style={styles.muted}>월요일부터 금요일까지</Text>
        {busy ? <Text style={styles.muted}>시간표를 불러오는 중…</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TimetableWeek entries={entries} />
        <Button
          label={busy ? "불러오는 중…" : "시간표 새로고침"}
          kind="secondary"
          onPress={() => void refresh()}
          disabled={busy}
        />
      </Card>
    </ScrollView>
  );
}

export function MealCalendar({ workspace }: { workspace: Workspace }) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() =>
    localDateKey(new Date()),
  );
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
        if (active) setMeals(result.data ?? []);
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "급식을 불러오지 못했습니다",
          );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [workspace.id, year, monthNumber]);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const leadingBlanks = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7;
  const slots: Array<string | undefined> = [
    ...Array(leadingBlanks).fill(undefined),
    ...Array.from(
      { length: daysInMonth },
      (_, index) =>
        `${year}-${String(monthNumber).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`,
    ),
  ];
  const selectedMeals = meals.filter(
    (meal) => meal.date.slice(0, 10) === selectedDate,
  );
  const shiftMonth = (amount: number) => {
    const next = new Date(year, monthNumber - 1 + amount, 1);
    setMonth(next);
    setSelectedDate(localDateKey(next));
  };
  return (
    <FlatList
      style={styles.content}
      data={selectedMeals}
      keyExtractor={(item) => `${item.date}-${item.type}`}
      ListHeaderComponent={
        <>
          <Card title="급식 달력">
            <View style={styles.row}>
              <TouchableOpacity onPress={() => shiftMonth(-1)}>
                <Text style={styles.link}>‹ 이전</Text>
              </TouchableOpacity>
              <Text style={styles.rowTitle}>
                {year}년 {monthNumber}월
              </Text>
              <TouchableOpacity onPress={() => shiftMonth(1)}>
                <Text style={styles.link}>다음 ›</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: "row" }}>
              {["월", "화", "수", "목", "금", "토", "일"].map((day) => (
                <Text
                  key={day}
                  style={{
                    width: "14.28%",
                    textAlign: "center",
                    color: SeugiColor.Gray600,
                    paddingVertical: 8,
                  }}
                >
                  {day}
                </Text>
              ))}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {slots.map((date, index) =>
                date ? (
                  <TouchableOpacity
                    key={date}
                    onPress={() => setSelectedDate(date)}
                    style={{
                      width: "14.28%",
                      aspectRatio: 1,
                      padding: 2,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 20,
                      backgroundColor:
                        selectedDate === date
                          ? SeugiColor.Primary500
                          : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color:
                          selectedDate === date
                            ? SeugiColor.White
                            : SeugiColor.Gray800,
                        fontWeight: selectedDate === date ? "700" : "400",
                      }}
                    >
                      {Number(date.slice(-2))}
                    </Text>
                    {meals.some((meal) => meal.date.slice(0, 10) === date) ? (
                      <View
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor:
                            selectedDate === date
                              ? SeugiColor.White
                              : SeugiColor.Primary500,
                        }}
                      />
                    ) : null}
                  </TouchableOpacity>
                ) : (
                  <View
                    key={`empty-${index}`}
                    style={{ width: "14.28%", aspectRatio: 1 }}
                  />
                ),
              )}
            </View>
            <Button
              label="오늘로 이동"
              kind="secondary"
              onPress={() => {
                const now = new Date();
                setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                setSelectedDate(localDateKey(now));
              }}
            />
          </Card>
          <Card title={`${selectedDate} 급식`}>
            {busy ? (
              <Text style={styles.muted}>급식 정보를 불러오는 중…</Text>
            ) : error ? (
              <Text style={styles.error}>{error}</Text>
            ) : null}
            {!busy && !error && !selectedMeals.length ? (
              <Text style={styles.muted}>이 날짜의 급식 정보가 없습니다.</Text>
            ) : null}
          </Card>
        </>
      }
      renderItem={({ item }) => (
        <Card title={item.type}>
          {item.calorie ? (
            <Text style={styles.muted}>{item.calorie}</Text>
          ) : null}
          {item.menu.map((dish, index) => (
            <Text key={`${index}-${dish}`}>{dish}</Text>
          ))}
        </Card>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 16 },
  schoolRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  homeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  catPrompt: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: SeugiColor.Primary500,
    borderRadius: 26,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowTitle: { fontWeight: "600" },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  row: {
    backgroundColor: SeugiColor.White,
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  link: { color: SeugiColor.Primary500 },
  input: {
    backgroundColor: SeugiColor.White,
    borderWidth: 1,
    borderColor: SeugiColor.Gray300,
    borderRadius: 10,
    padding: 13,
    marginBottom: 10,
  },
  answer: {
    backgroundColor: SeugiColor.Primary100,
    padding: 10,
    borderRadius: 8,
  },
});
