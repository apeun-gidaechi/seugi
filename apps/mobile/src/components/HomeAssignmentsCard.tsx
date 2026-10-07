import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { ClassroomTask, Task } from "@seugi/contracts";
import { SeugiColor } from "@seugi/design-tokens";

export function HomeAssignmentsCard({ tasks, classroomTasks, onOpen }: {
  tasks: Task[];
  classroomTasks: ClassroomTask[];
  onOpen: () => void;
}) {
  const now = new Date();
  const visibleTasks = partitionUpcoming(tasks, now);
  const visibleClassroomTasks = partitionUpcoming(classroomTasks, now);

  return <View style={styles.card}>
    <TouchableOpacity accessibilityRole="button" onPress={onOpen} style={styles.header}><Text style={styles.title}>다가오는 과제</Text><Text style={styles.arrow}>›</Text></TouchableOpacity>
    <AssignmentGroup title="구글 클래스룸 과제" tasks={visibleClassroomTasks} empty="과제가 없습니다" onTaskPress={(task) => { if (task.link) void Linking.openURL(task.link).catch(() => undefined); }} classroom />
    <AssignmentGroup title="일반 과제" tasks={visibleTasks} empty="과제가 없습니다" />
  </View>;
}

function partitionUpcoming<T extends Task | ClassroomTask>(tasks: T[], now: Date): T[] {
  const upcoming = tasks.filter((task) => task.dueDate && new Date(task.dueDate) >= now);
  const noDeadline = tasks.filter((task) => !task.dueDate);
  return [...upcoming, ...noDeadline];
}

function AssignmentGroup({ title, tasks, empty, classroom = false, onTaskPress }: {
  title: string;
  tasks: Array<Task | ClassroomTask>;
  empty: string;
  classroom?: boolean;
  onTaskPress?: (task: ClassroomTask) => void;
}) {
  return <View style={styles.group}>
    <Text style={styles.groupTitle}>{title}</Text>
    {tasks.length === 0 ? <Text style={styles.empty}>{empty}</Text> : tasks.map((task) => {
      const body = <>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <Text style={styles.description}>{task.description || "설명 없음"}</Text>
        <View style={styles.dateRow}><Text style={styles.date}>{task.dueDate ? new Date(task.dueDate).toLocaleString() : "기한 없음"}</Text>{!classroom && task.dueDate ? <Text style={styles.daysLeft}>{daysLeft(task.dueDate)}</Text> : null}</View>
      </>;
      return classroom
        ? <TouchableOpacity key={task.id} accessibilityRole="button" onPress={() => onTaskPress?.(task as ClassroomTask)} style={styles.task}>{body}{(task as ClassroomTask).link ? <Text style={styles.link}>과제 열기 ↗</Text> : null}</TouchableOpacity>
        : <View key={task.id} style={styles.task}>{body}</View>;
    })}
  </View>;
}

function daysLeft(dueDate: string) {
  const difference = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
  return difference > 0 ? `D-${difference}` : difference === 0 ? "D-Day" : `D+${Math.abs(difference)}`;
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 12, marginBottom: 12, padding: 16, gap: 12, borderRadius: 14, backgroundColor: SeugiColor.White },
  header: { minHeight: 28, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: SeugiColor.Gray800, fontSize: 17, fontWeight: "700" },
  arrow: { color: SeugiColor.Gray500, fontSize: 22, lineHeight: 24 },
  group: { gap: 8, borderTopWidth: 1, borderTopColor: SeugiColor.Gray100, paddingTop: 10 },
  groupTitle: { color: SeugiColor.Gray700, fontSize: 14, fontWeight: "600" },
  empty: { color: SeugiColor.Gray500, fontSize: 13, paddingVertical: 10 },
  task: { gap: 4, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: SeugiColor.Gray100 },
  taskTitle: { color: SeugiColor.Gray800, fontSize: 14, fontWeight: "600" },
  description: { color: SeugiColor.Gray600, fontSize: 13 },
  dateRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginTop: 4 },
  date: { color: SeugiColor.Gray500, fontSize: 12, flex: 1 },
  daysLeft: { color: SeugiColor.Gray600, fontSize: 12 },
  link: { color: SeugiColor.Primary500, fontSize: 13, alignSelf: "flex-end", paddingTop: 2 },
});
