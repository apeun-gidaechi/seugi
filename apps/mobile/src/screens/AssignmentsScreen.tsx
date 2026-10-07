import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Linking, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { ClassroomTask, Task, Workspace } from "@seugi/contracts";
import { api } from "../services/api";
import { localDateKey } from "../utils/date";
import { SeugiTextField } from "../design-system/TextField";
import { SeugiTopBar } from "../design-system/TopBar";

export function AssignmentsScreen({ workspace, onCreateTask }: { workspace: Workspace; onCreateTask: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskState, setTaskState] = useState<"loading" | "success" | "error">("loading");
  const canCreate = useCanCreateTask(workspace);
  const refresh = useCallback(async () => {
    setTaskState("loading");
    try {
      const result = await api.tasks(workspace.id);
      setTasks((result.data ?? []).sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999")));
      setTaskState("success");
    } catch {
      setTasks([]);
      setTaskState("error");
    }
  }, [workspace.id]);
  useEffect(() => { void refresh(); }, [refresh]);
  return <View style={styles.screen}><FlatList style={styles.content} data={tasks} keyExtractor={(item) => item.id}
    ListHeaderComponent={<><ClassroomTasks />{Platform.OS === "ios" || taskState === "success" ? <Text style={styles.sectionTitle}>일반 과제</Text> : null}</>}
    ListEmptyComponent={Platform.OS === "ios" ? taskState === "loading" ? <ActivityIndicator style={styles.loading} color={SeugiColor.Primary500} /> : <Text style={styles.empty}>과제가 없어요</Text> : null}
    renderItem={({ item }) => <View style={styles.taskCard}><View style={styles.taskHeader}><Text style={[styles.rowTitle, styles.taskName]}>{item.title}</Text><Text style={styles.taskDue}>{getDDayLabel(item.dueDate)}</Text></View>{item.content ? <Text style={styles.taskDescription}>{item.content}</Text> : null}</View>} />
    {Platform.OS === "android" && canCreate ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="과제 만들기" onPress={onCreateTask} style={styles.fab}><Text style={styles.fabText}>＋</Text></TouchableOpacity> : null}
  </View>;
}

export function TaskCreateScreen({ workspace, onCreated, onBack }: { workspace: Workspace; onCreated: () => Promise<void>; onBack: () => void }) {
  return <CreateTask workspace={workspace} onCreated={onCreated} onBack={onBack} />;
}

function useCanCreateTask(workspace: Workspace) {
  const [canCreate, setCanCreate] = useState(false);
  useEffect(() => { let active = true; Promise.all([api.memberInfo(), api.myProfile(workspace.id)]).then(([member, profile]) => active && setCanCreate(workspace.ownerId === member.data?.id || (!!profile.data?.role && profile.data.role !== "STUDENT"))).catch(() => undefined); return () => { active = false; }; }, [workspace.id, workspace.ownerId]);
  return canCreate;
}

function CreateTask({ workspace, onCreated, onBack }: { workspace: Workspace; onCreated: () => Promise<void>; onBack: () => void }) {
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
  if (!canCreate) return <View style={styles.taskCreateScreen}><SeugiTopBar backgroundColor={SeugiColor.Primary050} leading={<TouchableOpacity accessibilityRole="button" accessibilityLabel="뒤로" onPress={onBack}><Text style={styles.editorBack}>‹</Text></TouchableOpacity>} title={<Text style={styles.editorTitle}>과제 만들기</Text>} trailing={null} /></View>;
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const leadingDays = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
  const monthDays = [...Array<string | undefined>(leadingDays).fill(undefined), ...Array.from({ length: daysInMonth }, (_, index) => localDateKey(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), index + 1)))];
  const shiftMonth = (amount: number) => setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + amount, 1));
  return <View style={styles.taskCreateScreen}>
    <SeugiTopBar backgroundColor={SeugiColor.Primary050}
      leading={<TouchableOpacity accessibilityRole="button" accessibilityLabel="뒤로" onPress={onBack} disabled={busy}><Text style={styles.editorBack}>‹</Text></TouchableOpacity>}
      title={<Text style={styles.editorTitle}>과제 만들기</Text>}
      trailing={<TouchableOpacity accessibilityRole="button" accessibilityLabel="과제 만들기 완료" onPress={() => void create()} disabled={busy || !title.trim()}><Text style={[styles.createAction, (busy || !title.trim()) && styles.createActionDisabled]}>{busy ? "만드는 중…" : "만들기"}</Text></TouchableOpacity>}
    />
    <ScrollView style={styles.taskForm} keyboardShouldPersistTaps="handled">
      <Text style={styles.taskTitleLabel}>제목</Text>
      <SeugiTextField value={title} onChangeText={setTitle} containerStyle={styles.editorField} maxLength={120} editable={!busy} />
      <SeugiTextField value={content} onChangeText={setContent} containerStyle={styles.editorField} fieldStyle={styles.descriptionField} style={styles.descriptionInput} multiline textAlignVertical="top" editable={!busy} />
      <TouchableOpacity accessibilityRole="button" onPress={() => { setCalendarSelection(dueDate); setCalendarOpen(true); }} style={styles.dateButton} disabled={busy}><Text style={styles.dateText}>{Number(dueDate.slice(5, 7))}월 {Number(dueDate.slice(8, 10))}일까지</Text><Text style={styles.calendarIcon}>▦</Text></TouchableOpacity>
      {notice ? <Text accessibilityRole="alert" style={notice.includes("만들었") ? styles.answer : styles.error}>{notice}</Text> : null}
    </ScrollView>
    <Modal visible={calendarOpen} transparent animationType="fade" onRequestClose={() => setCalendarOpen(false)}><View style={styles.dateModalBackdrop}><View style={styles.dateDialog}><Text style={styles.dateDialogTitle}>마감일 선택</Text><View style={styles.monthHeader}><TouchableOpacity onPress={() => shiftMonth(-1)}><Text style={styles.link}>‹ 이전</Text></TouchableOpacity><Text style={styles.rowTitle}>{calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월</Text><TouchableOpacity onPress={() => shiftMonth(1)}><Text style={styles.link}>다음 ›</Text></TouchableOpacity></View><View style={styles.calendarGrid}>{["일", "월", "화", "수", "목", "금", "토"].map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}{monthDays.map((date, index) => date ? <TouchableOpacity key={date} accessibilityRole="button" accessibilityState={{ selected: calendarSelection === date }} onPress={() => setCalendarSelection(date)} style={[styles.calendarDay, calendarSelection === date && styles.calendarDaySelected]}><Text style={calendarSelection === date ? styles.calendarDayTextSelected : styles.calendarDayText}>{Number(date.slice(-2))}</Text></TouchableOpacity> : <View key={`blank-${index}`} style={styles.calendarDay} />)}</View><TouchableOpacity style={styles.todayButton} onPress={() => { const today = new Date(); setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setCalendarSelection(localDateKey(today)); }}><Text style={styles.link}>오늘</Text></TouchableOpacity><View style={styles.dateDialogActions}><TouchableOpacity onPress={() => setCalendarOpen(false)}><Text style={styles.muted}>취소</Text></TouchableOpacity><TouchableOpacity onPress={() => { setDueDate(calendarSelection); setCalendarOpen(false); }}><Text style={styles.link}>완료</Text></TouchableOpacity></View></View></View></Modal>
  </View>;
}

function ClassroomTasks() {
  const [items, setItems] = useState<ClassroomTask[]>([]); const [state, setState] = useState<"loading" | "success" | "error">("loading");
  useEffect(() => {
    let active = true;
    api.classroomTasks().then((result) => { if (active) { setItems(result.data ?? []); setState("success"); } }).catch(() => { if (active) { setItems([]); setState("error"); } });
    return () => { active = false; };
  }, []);
  if (Platform.OS === "android" && state !== "success") return null;
  return <><Text style={styles.sectionTitle}>구글 클래스룸 과제</Text>{state === "loading" ? <ActivityIndicator style={styles.loading} color={SeugiColor.Primary500} /> : state === "error" || items.length === 0 ? <Text style={styles.empty}>과제가 없어요</Text> : items.map((item) => <TouchableOpacity key={item.id} activeOpacity={1} disabled={Platform.OS !== "android" || !item.link} onPress={() => { if (item.link) void Linking.openURL(item.link).catch(() => undefined); }} style={styles.taskCard}><View style={styles.taskHeader}><Text style={[styles.rowTitle, styles.taskName]}>{item.title}</Text><Text style={styles.taskDue}>{getDDayLabel(item.dueDate)}</Text></View>{item.description ? <Text style={styles.taskDescription}>{item.description}</Text> : null}</TouchableOpacity>)}</>;
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
  taskCreateScreen: { flex: 1, backgroundColor: SeugiColor.Primary050 },
  taskForm: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  editorBack: { color: SeugiColor.Gray700, fontSize: 30, lineHeight: 34 },
  editorTitle: { color: SeugiColor.Gray800, fontSize: 18, fontWeight: "700" },
  createAction: { color: SeugiColor.White, backgroundColor: SeugiColor.Primary500, borderRadius: 14, overflow: "hidden", paddingHorizontal: 10, paddingVertical: 4, fontSize: 14 },
  createActionDisabled: { opacity: 0.5 },
  taskTitleLabel: { color: SeugiColor.Gray800, fontSize: 16, fontWeight: "600", marginLeft: 4, marginBottom: 4 },
  content: { flex: 1, padding: 16 },
  fab: { position: "absolute", right: 24, bottom: 24, width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: SeugiColor.Primary500, elevation: 6 },
  fabText: { color: SeugiColor.White, fontSize: 34, lineHeight: 38, fontWeight: "400" },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  empty: { color: SeugiColor.Gray600, textAlign: "center", padding: 30 },
  loading: { paddingVertical: 20 },
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
  descriptionField: { minHeight: 265, height: undefined, alignItems: "flex-start" },
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
