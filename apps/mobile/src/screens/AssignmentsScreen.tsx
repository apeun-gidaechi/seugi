import { useCallback, useEffect, useState } from "react";
import { FlatList, Linking, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { ClassroomTask, Task, Workspace } from "@seugi/contracts";
import { GOOGLE_WEB_CLIENT_ID } from "../config";
import { GoogleAuthButton } from "../components/GoogleAuthButton";
import { Button, Card } from "../components/ui";
import { api } from "../services/api";
import { localDateKey } from "../utils/date";

export function AssignmentsScreen({ workspace, onCreateTask }: { workspace: Workspace; onCreateTask: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => { const result = await api.tasks(workspace.id); setTasks((result.data ?? []).sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"))); }, [workspace.id]);
  useEffect(() => { refresh().catch((e) => setError(e instanceof Error ? e.message : "과제를 불러오지 못했습니다")); }, [refresh]);
  return <FlatList style={styles.content} data={tasks} keyExtractor={(item) => item.id}
    ListHeaderComponent={<><TaskCreationLink workspace={workspace} onPress={onCreateTask} /><ClassroomTasks /><Text style={styles.sectionTitle}>일반 과제</Text>{error ? <Text style={styles.error}>{error}</Text> : null}</>}
    ListEmptyComponent={!error ? <Text style={styles.empty}>등록된 일반 과제가 없습니다.</Text> : null}
    renderItem={({ item }) => <View style={styles.taskCard}><View style={styles.taskHeader}><Text style={[styles.rowTitle, styles.taskName]}>{item.title}</Text><Text style={styles.taskDue}>{getDDayLabel(item.dueDate)}</Text></View><Text>{item.content || "내용 없음"}</Text>{item.dueDate ? <Text style={styles.muted}>마감 {new Date(item.dueDate).toLocaleDateString()}</Text> : null}</View>} />;
}

export function TaskCreateScreen({ workspace, onCreated }: { workspace: Workspace; onCreated: () => Promise<void> }) {
  return <FlatList style={styles.content} data={[]} renderItem={() => null} ListHeaderComponent={<CreateTask workspace={workspace} onCreated={onCreated} />} />;
}

function useCanCreateTask(workspace: Workspace) {
  const [canCreate, setCanCreate] = useState(false);
  useEffect(() => { let active = true; Promise.all([api.memberInfo(), api.myProfile(workspace.id)]).then(([member, profile]) => active && setCanCreate(workspace.ownerId === member.data?.id || (!!profile.data?.role && profile.data.role !== "STUDENT"))).catch(() => undefined); return () => { active = false; }; }, [workspace.id, workspace.ownerId]);
  return canCreate;
}

function TaskCreationLink({ workspace, onPress }: { workspace: Workspace; onPress: () => void }) {
  const canCreate = useCanCreateTask(workspace);
  return canCreate ? <Card title="과제 관리"><Button label="과제 만들기" onPress={onPress} /></Card> : null;
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
  return <Card title="일반 과제 만들기"><TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="제목" maxLength={120} /><TextInput value={content} onChangeText={setContent} style={[styles.input, styles.descriptionInput]} placeholder="내용" multiline textAlignVertical="top" /><TouchableOpacity accessibilityRole="button" onPress={() => { setCalendarSelection(dueDate); setCalendarOpen(true); }} style={styles.dateButton}><Text style={styles.dateText}>{Number(dueDate.slice(5, 7))}월 {Number(dueDate.slice(8, 10))}일까지</Text><Text style={styles.calendarIcon}>▦</Text></TouchableOpacity><Button label={busy ? "만드는 중…" : "만들기"} onPress={create} disabled={busy || !title.trim()} />{notice ? <Text style={notice.includes("만들었") ? styles.answer : styles.error}>{notice}</Text> : null}
    <Modal visible={calendarOpen} transparent animationType="fade" onRequestClose={() => setCalendarOpen(false)}><View style={styles.dateModalBackdrop}><View style={styles.dateDialog}><Text style={styles.dateDialogTitle}>마감일 선택</Text><View style={styles.monthHeader}><TouchableOpacity onPress={() => shiftMonth(-1)}><Text style={styles.link}>‹ 이전</Text></TouchableOpacity><Text style={styles.rowTitle}>{calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월</Text><TouchableOpacity onPress={() => shiftMonth(1)}><Text style={styles.link}>다음 ›</Text></TouchableOpacity></View><View style={styles.calendarGrid}>{["일", "월", "화", "수", "목", "금", "토"].map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}{monthDays.map((date, index) => date ? <TouchableOpacity key={date} accessibilityRole="button" accessibilityState={{ selected: calendarSelection === date }} onPress={() => setCalendarSelection(date)} style={[styles.calendarDay, calendarSelection === date && styles.calendarDaySelected]}><Text style={calendarSelection === date ? styles.calendarDayTextSelected : styles.calendarDayText}>{Number(date.slice(-2))}</Text></TouchableOpacity> : <View key={`blank-${index}`} style={styles.calendarDay} />)}</View><TouchableOpacity style={styles.todayButton} onPress={() => { const today = new Date(); setCalendarMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setCalendarSelection(localDateKey(today)); }}><Text style={styles.link}>오늘</Text></TouchableOpacity><View style={styles.dateDialogActions}><TouchableOpacity onPress={() => setCalendarOpen(false)}><Text style={styles.muted}>취소</Text></TouchableOpacity><TouchableOpacity onPress={() => { setDueDate(calendarSelection); setCalendarOpen(false); }}><Text style={styles.link}>완료</Text></TouchableOpacity></View></View></View></Modal>
  </Card>;
}

function ClassroomTasks() {
  const [items, setItems] = useState<ClassroomTask[]>([]); const [notice, setNotice] = useState(""); const [connected, setConnected] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => { api.googleConnection().then((result) => setConnected(result.data ?? false)).catch(() => undefined); }, []);
  const load = async () => { if (busy) return; setBusy(true); setNotice(""); try { const result = await api.classroomTasks(); setItems(result.data ?? []); if (!result.data?.length) setNotice("표시할 클래스룸 과제가 없습니다."); } catch (e) { setNotice(e instanceof Error && e.message.includes("GOOGLE_CONNECTION_NOT_FOUND") ? "Google Classroom을 연결한 뒤 과제를 불러올 수 있습니다." : e instanceof Error ? e.message : "클래스룸 과제를 불러오지 못했습니다"); } finally { setBusy(false); } };
  useEffect(() => { if (connected) void load(); }, [connected]);
  const connect = async (code: string) => { await api.connectGoogle({ code, platform: Platform.OS === "ios" ? "IOS" : "ANDROID" }); setConnected(true); setNotice("Google Classroom을 연결했습니다."); };
  const disconnect = async () => { try { await api.removeGoogleConnection(); setConnected(false); setItems([]); setNotice("Google 연결을 해제했습니다."); } catch (e) { setNotice(e instanceof Error ? e.message : "Google 연결을 해제하지 못했습니다"); } };
  return <Card title="Google Classroom"><Text style={styles.muted}>{connected ? "Google 계정이 연결되어 있습니다." : "Google 계정을 연결하면 클래스룸 과제를 볼 수 있습니다."}</Text>{Platform.OS !== "web" && GOOGLE_WEB_CLIENT_ID ? connected ? <Button label="Google 연결 해제" kind="secondary" onPress={disconnect} /> : <GoogleAuthButton label="Google Classroom 연결" onCode={connect} onError={setNotice} /> : null}{connected ? <Button label={busy ? "불러오는 중…" : "새로고침"} kind="secondary" onPress={load} disabled={busy} /> : null}{busy ? <Text style={styles.muted}>클래스룸 과제를 불러오는 중…</Text> : null}{notice ? <Text style={styles.muted}>{notice}</Text> : null}{items.map((item) => <View key={item.id} style={styles.classroomTask}><View style={styles.taskHeader}><Text style={styles.rowTitle}>{item.title}</Text><Text style={styles.taskDue}>{getDDayLabel(item.dueDate)}</Text></View>{item.description ? <Text>{item.description}</Text> : null}{item.dueDate ? <Text style={styles.muted}>마감 {new Date(item.dueDate).toLocaleDateString()}</Text> : null}{item.link ? <TouchableOpacity onPress={() => Linking.openURL(item.link!).catch(() => setNotice("과제 링크를 열지 못했습니다"))}><Text style={styles.link}>과제 열기 ↗</Text></TouchableOpacity> : null}</View>)}</Card>;
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
  content: { flex: 1, padding: 16 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  empty: { color: SeugiColor.Gray600, textAlign: "center", padding: 30 },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
  input: { backgroundColor: SeugiColor.White, borderWidth: 1, borderColor: SeugiColor.Gray300, borderRadius: 10, padding: 13, marginBottom: 10 },
  answer: { backgroundColor: SeugiColor.Primary100, padding: 10, borderRadius: 8 },
  link: { color: SeugiColor.Primary500 },
  rowTitle: { fontWeight: "600" },
  sectionTitle: { color: SeugiColor.Gray800, fontSize: 16, fontWeight: "600", marginHorizontal: 4, marginTop: 4, marginBottom: 8 },
  taskHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  taskCard: { backgroundColor: SeugiColor.White, borderRadius: 12, padding: 12, marginBottom: 8 },
  taskName: { flex: 1 },
  taskDue: { color: SeugiColor.White, backgroundColor: SeugiColor.Primary500, overflow: "hidden", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, fontSize: 12, fontWeight: "600" },
  classroomTask: { borderTopWidth: 1, borderColor: SeugiColor.Gray100, paddingTop: 12, marginTop: 8, gap: 6 },
  descriptionInput: { minHeight: 265 },
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
