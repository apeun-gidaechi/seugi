import { useCallback, useEffect, useState } from "react";
import { FlatList, Linking, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { ClassroomTask, Task, Workspace } from "@seugi/contracts";
import { GOOGLE_WEB_CLIENT_ID } from "../config";
import { GoogleAuthButton } from "../components/GoogleAuthButton";
import { Button, Card } from "../components/ui";
import { api } from "../services/api";

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
  const [title, setTitle] = useState(""); const [content, setContent] = useState(""); const [dueDate, setDueDate] = useState(""); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState("");
  const create = async () => {
    if (busy || !title.trim()) return;
    setBusy(true); setNotice("");
    try {
      let normalizedDueDate: string | undefined;
      if (dueDate.trim()) {
        const dateText = dueDate.trim(); const date = new Date(`${dateText}T00:00:00.000Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateText) throw new Error("마감일은 올바른 YYYY-MM-DD 날짜로 입력해 주세요");
        normalizedDueDate = date.toISOString();
      }
      await api.createTask({ workspaceId: workspace.id, title: title.trim(), content: content.trim() || undefined, dueDate: normalizedDueDate });
      setTitle(""); setContent(""); setDueDate(""); setNotice("과제를 만들었습니다."); await onCreated();
    } catch (error) { setNotice(error instanceof Error ? error.message : "과제를 만들지 못했습니다"); }
    finally { setBusy(false); }
  };
  if (!canCreate) return null;
  return <Card title="일반 과제 만들기"><TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="과제 제목" maxLength={120} /><TextInput value={content} onChangeText={setContent} style={styles.input} placeholder="과제 설명" multiline /><TextInput value={dueDate} onChangeText={setDueDate} style={styles.input} placeholder="마감일 (YYYY-MM-DD, 선택)" keyboardType="numbers-and-punctuation" /><Button label={busy ? "만드는 중…" : "과제 만들기"} onPress={create} disabled={busy || !title.trim()} />{notice ? <Text style={notice.includes("만들었") ? styles.answer : styles.error}>{notice}</Text> : null}</Card>;
}

function ClassroomTasks() {
  const [items, setItems] = useState<ClassroomTask[]>([]); const [notice, setNotice] = useState("클래스룸 과제를 불러오세요."); const [connected, setConnected] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => { api.googleConnection().then((result) => setConnected(result.data ?? false)).catch(() => undefined); }, []);
  const load = async () => { if (busy) return; setBusy(true); setNotice(""); try { const result = await api.classroomTasks(); setItems(result.data ?? []); if (!result.data?.length) setNotice("표시할 클래스룸 과제가 없습니다."); } catch (e) { setNotice(e instanceof Error && e.message.includes("GOOGLE_CONNECTION_NOT_FOUND") ? "Google Classroom을 연결한 뒤 과제를 불러올 수 있습니다." : e instanceof Error ? e.message : "클래스룸 과제를 불러오지 못했습니다"); } finally { setBusy(false); } };
  const connect = async (code: string) => { await api.connectGoogle({ code, platform: Platform.OS === "ios" ? "IOS" : "ANDROID" }); setConnected(true); setNotice("Google Classroom을 연결했습니다."); };
  const disconnect = async () => { try { await api.removeGoogleConnection(); setConnected(false); setItems([]); setNotice("Google 연결을 해제했습니다."); } catch (e) { setNotice(e instanceof Error ? e.message : "Google 연결을 해제하지 못했습니다"); } };
  return <Card title="Google Classroom"><Text style={styles.muted}>{connected ? "Google 계정이 연결되어 있습니다." : "Google 계정을 연결하면 클래스룸 과제를 볼 수 있습니다."}</Text>{Platform.OS !== "web" && GOOGLE_WEB_CLIENT_ID ? connected ? <Button label="Google 연결 해제" kind="secondary" onPress={disconnect} /> : <GoogleAuthButton label="Google Classroom 연결" onCode={connect} onError={setNotice} /> : null}<Button label={busy ? "불러오는 중…" : "과제 불러오기"} kind="secondary" onPress={load} disabled={busy || !connected} />{notice ? <Text style={styles.muted}>{notice}</Text> : null}{items.map((item) => <View key={item.id} style={styles.classroomTask}><View style={styles.taskHeader}><Text style={styles.rowTitle}>{item.title}</Text><Text style={styles.taskDue}>{getDDayLabel(item.dueDate)}</Text></View>{item.description ? <Text>{item.description}</Text> : null}{item.dueDate ? <Text style={styles.muted}>마감 {new Date(item.dueDate).toLocaleDateString()}</Text> : null}{item.link ? <TouchableOpacity onPress={() => Linking.openURL(item.link!).catch(() => setNotice("과제 링크를 열지 못했습니다"))}><Text style={styles.link}>과제 열기 ↗</Text></TouchableOpacity> : null}</View>)}</Card>;
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
});
