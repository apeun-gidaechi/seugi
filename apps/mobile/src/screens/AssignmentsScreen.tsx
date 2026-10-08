import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import { SeugiAddIcon } from "../design-system/AddIcon";
import type { ClassroomTask, Task, Workspace } from "@seugi/contracts";
import { api } from "../services/api";
import { formatAssignmentDueDate, orderAssignments } from "../utils/assignments";

export function AssignmentsScreen({ workspace, onCreateTask }: { workspace: Workspace; onCreateTask: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskState, setTaskState] = useState<"loading" | "success" | "error">("loading");
  const canCreate = useCanCreateTask(workspace);
  const refresh = useCallback(async () => {
    setTaskState("loading");
    try {
      const result = await api.tasks(workspace.id);
      setTasks(orderAssignments(result.data ?? [], Platform.OS));
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
    renderItem={({ item }) => <View style={styles.taskCard}><View style={[styles.taskHeader, Platform.OS === "ios" && item.content == null && styles.taskHeaderNoDescription]}><Text style={[styles.rowTitle, styles.taskName]}>{item.title}</Text><Text style={styles.taskDue}>{formatAssignmentDueDate(item.dueDate, Platform.OS)}</Text></View>{Platform.OS === "android" || item.content != null ? <Text style={styles.taskDescription}>{item.content ?? ""}</Text> : null}</View>} />
    {Platform.OS === "android" && canCreate ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="과제 만들기" onPress={onCreateTask} style={styles.fab}><SeugiAddIcon color={SeugiColor.White} /></TouchableOpacity> : null}
  </View>;
}

export function useCanCreateTask(workspace: Workspace) {
  const [canCreate, setCanCreate] = useState(false);
  useEffect(() => { let active = true; Promise.all([api.memberInfo(), api.myProfile(workspace.id)]).then(([member, profile]) => active && setCanCreate(workspace.ownerId === member.data?.id || (!!profile.data?.role && profile.data.role !== "STUDENT"))).catch(() => undefined); return () => { active = false; }; }, [workspace.id, workspace.ownerId]);
  return canCreate;
}

function ClassroomTasks() {
  const [items, setItems] = useState<ClassroomTask[]>([]); const [state, setState] = useState<"loading" | "success" | "error">("loading");
  useEffect(() => {
    let active = true;
    api.classroomTasks().then((result) => { if (active) { setItems(orderAssignments(result.data ?? [], Platform.OS)); setState("success"); } }).catch(() => { if (active) { setItems([]); setState("error"); } });
    return () => { active = false; };
  }, []);
  if (Platform.OS === "android" && state !== "success") return null;
  return <><Text style={styles.sectionTitle}>구글 클래스룸 과제</Text>{state === "loading" ? <ActivityIndicator style={styles.loading} color={SeugiColor.Primary500} /> : state === "error" || (Platform.OS === "ios" && items.length === 0) ? <Text style={styles.empty}>과제가 없어요</Text> : items.map((item) => <TouchableOpacity key={item.id} activeOpacity={1} disabled={Platform.OS !== "android" || !item.link} onPress={() => { if (item.link) void Linking.openURL(item.link).catch(() => undefined); }} style={styles.taskCard}><View style={[styles.taskHeader, Platform.OS === "ios" && item.description == null && styles.taskHeaderNoDescription]}><Text style={[styles.rowTitle, styles.taskName]}>{item.title}</Text><Text style={styles.taskDue}>{formatAssignmentDueDate(item.dueDate, Platform.OS)}</Text></View>{Platform.OS === "android" || item.description != null ? <Text style={styles.taskDescription}>{item.description ?? ""}</Text> : null}</TouchableOpacity>)}</>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, padding: 16 },
  fab: { position: "absolute", right: 24, bottom: 24, width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", backgroundColor: SeugiColor.Primary500, elevation: 6 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  empty: { color: SeugiColor.Gray600, textAlign: "center", padding: 30 },
  loading: { paddingVertical: 20 },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
  answer: { backgroundColor: SeugiColor.Primary100, padding: 10, borderRadius: 8 },
  link: { color: SeugiColor.Primary500 },
  rowTitle: { fontWeight: "600" },
  sectionTitle: { color: SeugiColor.Gray800, fontSize: 16, fontWeight: "600", marginHorizontal: 4, marginTop: 4, marginBottom: 8 },
  taskHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 },
  taskHeaderNoDescription: { marginBottom: 0 },
  taskCard: { backgroundColor: SeugiColor.White, borderRadius: 12, padding: 12, marginBottom: 8, shadowColor: SeugiColor.Primary500, shadowOffset: { width: 0, height: 3 }, shadowOpacity: Platform.OS === "ios" ? 0.04 : 0, shadowRadius: 9, elevation: Platform.OS === "android" ? 3 : 0 },
  taskDescription: { color: SeugiColor.Gray600, fontSize: 14 },
  taskName: { flex: 1 },
  taskDue: { color: SeugiColor.White, backgroundColor: SeugiColor.Primary500, overflow: "hidden", borderRadius: Platform.OS === "ios" ? 10 : 14, paddingHorizontal: 10, paddingVertical: 4, fontSize: Platform.OS === "android" ? 14 : 12, fontWeight: Platform.OS === "android" ? "600" : "400" },
});
