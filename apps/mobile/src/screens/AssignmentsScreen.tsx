import { useCallback, useEffect, useState } from "react";
import { FlatList, Linking, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { ClassroomTask, Task, Workspace } from "@seugi/contracts";
import { Button, Card } from "../components/ui";
import { api } from "../services/api";
import { localDateKey } from "../utils/date";
import { SeugiTextField } from "../design-system/TextField";

export function AssignmentsScreen({ workspace, onCreateTask }: { workspace: Workspace; onCreateTask: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");
  const canCreate = useCanCreateTask(workspace);
  const refresh = useCallback(async () => { const result = await api.tasks(workspace.id); setTasks((result.data ?? []).sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))); }, [workspace.id]);
  useEffect(() => { refresh().catch((e) => setError(e instanceof Error ? e.message : "과제를 불러오지 못했습니다")); }, [refresh]);
  return <View style={styles.screen}><FlatList style={styles.content} data={tasks} keyExtractor={(item) => item.id}
    ListHeaderComponent={<><ClassroomTasks /><Text style={styles.sectionTitle}>일반 과제</Text>{error ? <Text style={styles.error}>{error}</Text> : null}</>}
    ListEmptyComponent={!error ? <Text style={styles.empty}>등록된 일반 과제가 없습니다.</Text> : null}
    renderItem={({ item }) => <View style={styles.taskCard}><View style={styles.taskHeader}><Text style={[styles.rowTitle, styles.taskName]}>{item.title}</Text><Text style={styles.taskDue}>{getDDayLabel(item.dueDate)}</Text></View>{item.content ? <Text style={styles.taskDescription}>{item.content}</Text> : null}</View>} />
    {Platform.OS === "android" && canCreate ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="과제 만들기" onPress={onCreateTask} style={styles.fab}><Text style={styles.fabText}>＋</Text></TouchableOpacity> : null}
  </View>;
}

export function TaskCreateScreen({ workspace, onCreated }: { workspace: Workspace; onCreated: () => Promise<void> }) {
  return <FlatList style={styles.content} data={[]} renderItem={() => null} ListHeaderComponent={<CreateTask workspace={workspace} onCreated={onCreated} />} />;
}

function useCanCreateTask(workspace: Workspace) {
  const [canCreate, setCanCreate] = useState(false);
  useEffect(() => { let active = true; Promise.all([api.memberInfo(), api.myProfile(workspace.id)]).then(([member, profile]) => active && setCanCreate(workspace.ownerId === member.data?.id || (!!profile.data?.role && profile.data.role !== "STUDENT"))).catch(() => undefined); return () => { active = false; }; }, [workspace.id, workspace.ownerId]);
  return canCreate;
}

function CreateTask({ workspace, onCreated }: { workspace: Workspace; onCreated: () => Promise<void> }) {
  const canCreate = useCanCreateTask(workspace);
  const [title, setTitle] = useState(""); const [content, setContent] = useState(""); const [dueDate, setDueDate] = useState(() => localDateKey(new Date())); const [calendarSelection, setCalendarSelection] = useState(dueDate); const [calendarMonth, setCalendarMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); }); const [calendarOpen, setCalendarOpen] = useState(false); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState("");
  const create = async () => {
    if (busy || !title.trim()) return;
    setBusy(true); setNotice("");
    try {
      const normalizedDueDate = new Date(`${dueDate}T00:00:00.000Z`).toISOString();
      await api.createTask({ workspaceId: workspace.id, title: title.trim(), content: content.trim() || undefined, dueDate: normalizedDueDate });
      setTitle(""); setContent(""); setDueDate(""); setNotice("과제를 만들었습니다."); await onCreated();
    } catch (error) { setNotice(error instanceof Error ? error.message : "과제를 만들지 못했습니다"); }
    finally { setBusy(false); }
  };
  if (!canCreate) return null;
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const leadingDays = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
  const monthDays = [...Array<string | undefined>(leadingDays).fill(undefined), ...Array.from({ length: daysInMonth }, (_, index) => localDateKey(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), index + 1)))];
  const shiftMonth = (amount: number) => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + amount, 1));
  return <Card title="일반 과제 만들기"><SeugiTextField value={title} onChangeText={setTitle} containerStyle={styles.editorField} placeholder="제목" maxLength={120} /><SeugiTextField value={content} onChangeText={setContent} containerStyle={styles.editorField} style={styles.descriptionInput} placeholder="내용" multiline textAlignVertical="top" /><TouchableOpacity accessibilityRole="button" onPress={() => { setCalendarSelection(dueDate); setCalendarOpen(true); }} style={styles.dateButton}><Text style={styles.dateText}>{Number(dueDate.slice(5, 7))}월 {Number(dueDate.slice(8, 10))}일까지</Text><Text style={styles.calendarIcon}>▦</Text></TouchableOpacity><Button label={busy ? "만드는 중…" : "만들기"} onPress={create} disabled={busy || !title.trim()} />{notice ? <Text style={notice.includes("만들었") ? styles.answer : styles.error}>{notice}</Text> : null}
    <Modal visible={calendarOpen} transparent animationType="fade" onRequestClose={() => setCalendarOpen(false)}><View style={styles.dateModalBackdrop}><View style={styles.dateDialog}><Text style={styles.dateDialogTitle}>마감일 선택</Text><View style={styles.monthHeader}><TouchableOpacity onPress={() => shiftMonth(-1)}><Text style={styles.link}>‹ 이전</Text></TouchableOpacity><Text style={styles.rowTitle}>{calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월</Text><TouchableOpacity onPress={() => shiftMonth(1)}><Text style={styles.link}>다음 ›</Text></TouchableOpacity></View><View style={styles.calendarGrid}>{["일", "월", "화", "수", "목", "금", "토"].map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}{monthDays.map((date, index) => date ? <TouchableOpacity key={date} accessibilityRole="button" accessibilityState={{ selected: calendarSelection === date }} onPress={() => setCalendarSelection(date)} style={[styles.calendarDay, calendarSelection === date && styles.calendarDaySelected]}><Text style={calendarSelection === date ? styles.calendarDayTextSelected : styles.calendarDayText}>{Number(date.slice(-2))}</Text></TouchableOpacity> : <View key={`blank-${index}`} style={styles.calendarDay} />)}</View><TouchableOpacity style={styles.todayButton} onPress={() => { const today = new Date(); setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setCalendarSelection(localDateKey(today)); }}><Text style={styles.link}>오늘</Text></TouchableOpacity><View style={styles.dateDialogActions}><TouchableOpacity onPress={() => setCalendarOpen(false)}><Text style={styles.muted}>취소</Text></TouchableOpacity><TouchableOpacity onPress={() => { setDueDate(calendarSelection); setCalendarOpen(false); }}><Text style={styles.link}>완료</Text></TouchableOpacity></View></View></View></Modal>
  </Card>;
}

function ClassroomTasks() {
  const [items, setItems] = useState<ClassroomTask[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    api.classroomTasks().then((result) => { if (active) setItems(result.data ?? []); }).catch(() => { if (active) setItems([]); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <><Text style={styles.sectionTitle}>구글 클래스룸 과제</Text>{loading ? <Text style={styles.empty}>불러오는 중…</Text> : items.length === 0 ? <Text style={styles.empty}>과제가 없어요</Text> : items.map((item) => <TouchableOpacity key={item.id} activeOpacity={1} disabled={Platform.OS !== "android" || !item.link} onPress={() => { if (item.link) void Linking.openURL(item.link).catch(() => undefined); }} style={styles.taskCard}><View style={styles.taskHeader}><Text style={[styles.rowTitle, styles.taskName]}>{item.title}</Text><Text style={styles.taskDue}>{getDDayLabel(item.dueDate)}</Text></View>{item.description ? <Text style={styles.taskDescription}>{item.description}</Text> : null}</TouchableOpacity>)}</>;
}

function getDDayLabel(dueDate?: string | null) {
  if (!dueDate) return "기한없음";
  const [year, month, day] = dueDate.slice(0, 10).split("-").map(Number);
  const due = new Date(year!, month! - 1, day!);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  return days > 0 ? `D-${days}` : days < 0 ? `D+${Math.abs(days)}` : "D Day";
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, padding: 16 },
  fab: { position: "absolute", right: 24, bottom: 24, width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: SeugiColor.Primary500, elevation: 6 },
  fabText: { color: SeugiColor.White, fontSize: 34, lineHeight: 38, fontWeight: "400" },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  empty: { color: SeugiColor.Gray600, textAlign: "center", padding: 30 },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
  editorField: { marginBottom: 10 },
  answer: { backgroundColor: SeugiColor.Primary100, padding: 10, borderRadius: 8 },
  link: { color: SeugiColor.Primary500 },
  rowTitle: { fontWeight: "600" },
  sectionTitle: { color: SeugiColor.Gray800, fontSize: 16, fontWeight: "600", marginHorizontal: 4, marginTop: 4, marginBottom: 8 },
  taskHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  taskCard: { backgroundColor: SeugiColor.White, borderRadius: 12, padding: 12, marginBottom: 8 },
  taskDescription: { color: SeugiColor.Gray600, fontSize: 14 },
  taskName: { flex: 1 },
  taskDue: { color: SeugiColor.White, backgroundColor: SeugiColor.Primary500, overflow: "hidden", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, fontSize: 12, fontWeight: "600" },
  descriptionInput: { minHeight: 265, paddingTop: 14, paddingBottom: 14, textAlignVertical: "top" },
  dateButton: { minHeight: 52, borderWidth: 1.5, borderColor: SeugiColor.Gray400, backgroundColor: SeugiColor.White, borderRadius: 12, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", marginBottom: 12 },
  dateText: { color: SeugiColor.Gray800, fontWeight: "600" },
  calendarIcon: { color: SeugiColor.Gray500, marginLeft: "auto", fontSize: 20 },
  dateModalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 24 },
  dateDialog: { backgroundColor: SeugiColor.White, borderRadius: 16, padding: 18, gap: 14 },
  dateDialogTitle: { color: SeugiColor.Gray800, fontSize: 17, fontWeight: "700" },
  monthHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  weekday: { width: "14.285%", textAlign: "center", color: SeugiColor.Gray600, paddingVertical: 8 },
  calendarDay: { width: "14.285%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 24 },
  calendarDaySelected: { backgroundColor: SeugiColor.Primary500 },
  calendarDayText: { color: SeugiColor.Gray800 },
  calendarDayTextSelected: { color: SeugiColor.White, fontWeight: "700" },
  todayButton: { alignSelf: "flex-end", padding: 8 },
  dateDialogActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 24, paddingTop: 4 },
});
