import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { ClassroomTask, Task } from "@seugi/contracts";
import { SeugiColor } from "@seugi/design-tokens";

export function HomeAssignmentsCard({ tasks, classroomTasks, loading, error, onOpen }: {
  tasks: Task[];
  classroomTasks: ClassroomTask[];
  loading: boolean;
  error: boolean;
  onOpen: () => void;
}) {
  const rows = Platform.OS === "ios"
    ? tasks.slice().sort((a, b) => {
      if (!a.dueDate) return b.dueDate ? 1 : 0;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    })
    : [...classroomTasks, ...tasks]
      .filter((task) => task.dueDate && new Date(task.dueDate) > new Date())
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
      .slice(0, 3);

  return <View style={styles.card}>
    <TouchableOpacity accessibilityRole="button" onPress={onOpen} style={styles.header}><Text style={styles.title}>다가오는 과제</Text><Text style={styles.arrow}>›</Text></TouchableOpacity>
    {loading ? <Text style={styles.loading}>불러오는 중…</Text> : error ? <Text style={styles.empty}>{Platform.OS === "ios" ? "과제를 불러올 수 없어요" : "구글 계정을 등록하고 과제를 확인하세요"}</Text> : rows.length === 0 ? <Text style={styles.empty}>과제가 없어요</Text> : <View style={styles.list}>
      {rows.map((task, index) => {
        const dueDate = task.dueDate;
        const day = dueDate ? dayDifference(dueDate) : undefined;
        const dateLabel = dueDate ? formatMonthDay(dueDate) : "기한없음";
        const dDayLabel = day === undefined ? "기한없음" : day > 0 ? `D-${day}` : day < 0 ? `D+${Math.abs(day)}` : Platform.OS === "ios" ? "D-0" : "D-Day";
        return <View key={`${"link" in task ? "classroom" : "workspace"}-${task.id}-${index}`} style={styles.row}>
          <Text style={styles.date}>{dateLabel}</Text>
          <Text numberOfLines={1} style={styles.task}>{task.title}</Text>
          <Text style={styles.dDay}>{dDayLabel}</Text>
        </View>;
      })}
    </View>}
  </View>;
}

function dayDifference(value: string) {
  const date = new Date(value);
  const due = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function formatMonthDay(value: string) {
  const date = new Date(value);
  return `${date.getMonth() + 1}/${String(date.getDate()).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 12, marginBottom: 12, padding: 16, gap: 12, borderRadius: 14, backgroundColor: SeugiColor.White },
  header: { minHeight: 28, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: SeugiColor.Gray800, fontSize: 17, fontWeight: "700" },
  arrow: { color: SeugiColor.Gray500, fontSize: 22, lineHeight: 24 },
  list: { gap: 16 },
  row: { minHeight: 30, flexDirection: "row", alignItems: "center", gap: 10 },
  date: { color: SeugiColor.Primary500, fontSize: 14 },
  task: { flex: 1, minWidth: 0, color: SeugiColor.Gray800, fontSize: 14 },
  dDay: { color: SeugiColor.Gray600, fontSize: 13 },
  loading: { color: SeugiColor.Gray500, textAlign: "center", paddingVertical: 12 },
  empty: { color: SeugiColor.Gray500, textAlign: "center", paddingVertical: 12 },
});
