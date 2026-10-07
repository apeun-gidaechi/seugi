import { useCallback, useEffect, useState } from "react";
import { FlatList, ScrollView, Text, TextInput, View, StyleSheet } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { Meal, Schedule, Task, Timetable, Workspace } from "@seugi/contracts";
import { Button, Card } from "../components/ui";
import { api } from "../services/api";
import { localDateKey } from "../utils/date";

export function HomeScreen({ workspace }: { workspace: Workspace }) {
  const [tasks, setTasks] = useState<Task[]>([]); const [timetable, setTimetable] = useState<Timetable[]>([]); const [meals, setMeals] = useState<Meal[]>([]); const [schedules, setSchedules] = useState<Schedule[]>([]);
  const refreshTasks = useCallback(async () => { const result = await api.tasks(workspace.id); setTasks(result.data ?? []); }, [workspace.id]);
  useEffect(() => { refreshTasks().catch(() => undefined); api.weeklyTimetable(workspace.id).then((x) => setTimetable(x.data ?? [])).catch(() => undefined); api.meals(workspace.id).then((x) => setMeals(x.data ?? [])).catch(() => undefined); api.schedules(workspace.id).then((x) => setSchedules(x.data ?? [])).catch(() => undefined); }, [workspace.id, refreshTasks]);
  const today = localDateKey(new Date()); const todaysMeals = meals.filter((item) => item.date.slice(0, 10) === today); const upcoming = schedules.filter((item) => item.date.slice(0, 10) >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
  return <FlatList style={styles.content} data={tasks.slice(0, 3)} keyExtractor={(item) => item.id} ListHeaderComponent={<><Card title="오늘의 급식">{todaysMeals.length ? todaysMeals.map((meal) => <View key={`${meal.date}-${meal.type}`}><Text style={styles.rowTitle}>{meal.type}{meal.calorie ? ` · ${meal.calorie}` : ""}</Text><Text>{meal.menu.join(" · ")}</Text></View>) : <Text>오늘 등록된 급식 정보가 없습니다.</Text>}</Card><Card title="다가오는 학사 일정">{upcoming.length ? upcoming.map((item) => <Text key={`${item.date}-${item.name}`}>{item.date.slice(0, 10)} · {item.name}</Text>) : <Text>예정된 학사 일정이 없습니다.</Text>}</Card><Card title="이번 주 시간표"><TimetableWeek entries={timetable} /></Card><Card title="일반 과제"><Text>{tasks.length ? `과제 ${tasks.length}개 · 과제 탭에서 모두 보기` : "등록된 과제가 없습니다."}</Text></Card><CatSeugi /></>} renderItem={({ item }) => <Card title={item.title}><Text>{item.content || "내용 없음"}</Text><Text style={styles.muted}>{item.dueDate ? `마감 ${new Date(item.dueDate).toLocaleDateString()}` : "마감일 없음"}</Text></Card>} />;
}

export { HomeScreen as Home };

export function TimetableWeek({ entries }: { entries: Timetable[] }) {
  const today = new Date();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  const days = Array.from({ length: 5 }, (_, index) => { const date = new Date(monday); date.setDate(monday.getDate() + index); return localDateKey(date); });
  const periods = [...new Set(entries.map((entry) => entry.time))].sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));
  const weekLabel = `${days[0].slice(5).replace("-", "/")}–${days[4].slice(5).replace("-", "/")}`;
  const subjectAt = (date: string, period: string) => entries.find((entry) => entry.date.slice(0, 10) === date && entry.time === period)?.subject ?? "";
  const rowStyle = { flexDirection: "row" as const };
  const periodStyle = { width: 32, paddingVertical: 8, borderWidth: 1, borderColor: SeugiColor.Gray300, fontSize: 11, textAlign: "center" as const };
  const cellStyle = { flex: 1, minWidth: 0, paddingVertical: 8, paddingHorizontal: 1, borderWidth: 1, borderColor: SeugiColor.Gray300, fontSize: 10, textAlign: "center" as const };
  const headStyle = { fontWeight: "700" as const, backgroundColor: SeugiColor.Primary050 };
  return <View><Text style={styles.muted}>{weekLabel} · 월–금</Text><View style={rowStyle}><Text style={[periodStyle, headStyle]}>교시</Text>{days.map((date, index) => <Text key={date} style={[cellStyle, headStyle]}>{["월", "화", "수", "목", "금"][index]}</Text>)}</View>
    {periods.length ? periods.map((period) => <View key={period} style={rowStyle}><Text style={periodStyle}>{period}</Text>{days.map((date) => <Text key={`${date}-${period}`} style={cellStyle} numberOfLines={2}>{subjectAt(date, period)}</Text>)}</View>) : <Text style={styles.muted}>이번 주 시간표가 없습니다.</Text>}
  </View>;
}

export function TimetablePage({ workspace }: { workspace: Workspace }) {
  const [entries, setEntries] = useState<Timetable[]>([]); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const refresh = useCallback(async () => { setBusy(true); setError(""); try { const result = await api.weeklyTimetable(workspace.id); setEntries(result.data ?? []); } catch (reason) { setError(reason instanceof Error ? reason.message : "시간표를 불러오지 못했습니다"); } finally { setBusy(false); } }, [workspace.id]);
  useEffect(() => { void refresh(); }, [refresh]);
  return <ScrollView style={styles.content}><Card title="주간 시간표"><Text style={styles.muted}>월요일부터 금요일까지</Text>{busy ? <Text style={styles.muted}>시간표를 불러오는 중…</Text> : null}{error ? <Text style={styles.error}>{error}</Text> : null}<TimetableWeek entries={entries} /><Button label={busy ? "불러오는 중…" : "시간표 새로고침"} kind="secondary" onPress={() => void refresh()} disabled={busy} /></Card></ScrollView>;
}

function CatSeugi() {
  const [question, setQuestion] = useState(""); const [answer, setAnswer] = useState("");
  return <Card title="캣스기"><TextInput value={question} onChangeText={setQuestion} style={styles.input} placeholder="무엇이든 물어보세요" /><Button label="질문하기" onPress={() => api.askCatSeugi(question).then((x) => setAnswer(x.data ?? "")).catch((e) => setAnswer(e.message))} />{answer ? <Text style={styles.answer}>{answer}</Text> : null}</Card>;
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 16 },
  rowTitle: { fontWeight: "600" },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  input: { backgroundColor: SeugiColor.White, borderWidth: 1, borderColor: SeugiColor.Gray300, borderRadius: 10, padding: 13, marginBottom: 10 },
  answer: { backgroundColor: SeugiColor.Primary100, padding: 10, borderRadius: 8 },
});
