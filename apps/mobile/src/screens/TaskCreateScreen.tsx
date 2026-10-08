import { useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { SeugiColor } from "@seugi/design-tokens";
import type { Workspace } from "@seugi/contracts";
import { Button } from "../components/ui";
import { SeugiTextField } from "../design-system/TextField";
import { SeugiTopBar } from "../design-system/TopBar";
import { SeugiBackIcon } from "../design-system/BackIcon";
import { SeugiCalendarIcon } from "../design-system/CalendarIcon";
import { api } from "../services/api";
import { localDateKey } from "../utils/date";
import { useCanCreateTask } from "./AssignmentsScreen";
import { serializeTaskDueDate, taskCreateFailureMessage } from "../utils/assignments";
import {
  finishTaskDatePicker,
  isTaskDateSelectable,
  taskCalendarSlots,
} from "../utils/taskCalendar";

export function TaskCreateScreen({
  workspace,
  onCreated,
  onBack,
}: {
  workspace: Workspace;
  onCreated: () => Promise<void>;
  onBack: () => void;
}) {
  const canCreate = useCanCreateTask(workspace);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dueDate, setDueDate] = useState(() => localDateKey(new Date()));
  const [calendarSelection, setCalendarSelection] = useState(dueDate);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const create = async () => {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      await api.createTask({
        workspaceId: workspace.id,
        title,
        description: content,
        dueDate: serializeTaskDueDate(dueDate),
      });
      setTitle("");
      setContent("");
      setDueDate("");
      setNotice("과제를 만들었습니다.");
      await onCreated();
    } catch (error) {
      const message = taskCreateFailureMessage(Platform.OS, error);
      if (Platform.OS === "android") ToastAndroid.show(message, ToastAndroid.SHORT);
      else setNotice(message);
    } finally {
      setBusy(false);
    }
  };
  if (!canCreate)
    return (
      <View style={styles.screen}>
        <SeugiTopBar
          backgroundColor={SeugiColor.Primary050}
          leading={
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="뒤로" onPress={onBack}>
              <SeugiBackIcon />
            </TouchableOpacity>
          }
          title={<Text style={styles.title}>과제 만들기</Text>}
          trailing={null}
        />
      </View>
    );

  const monthDays = taskCalendarSlots(calendarMonth.getFullYear(), calendarMonth.getMonth());
  const today = localDateKey(new Date());
  const shiftMonth = (amount: number) =>
    setCalendarMonth((month) => new Date(month.getFullYear(), month.getMonth() + amount, 1));
  const closeCalendar = (confirmed: boolean) => {
    const result = finishTaskDatePicker(dueDate, calendarSelection, today, confirmed);
    if (confirmed) setDueDate(result.dueDate);
    setCalendarSelection(result.selectedDate);
    setCalendarOpen(false);
  };

  return (
    <View style={styles.screen}>
      <SeugiTopBar
        backgroundColor={SeugiColor.Primary050}
        leading={
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="뒤로"
            onPress={onBack}
            disabled={busy}
          >
            <SeugiBackIcon />
          </TouchableOpacity>
        }
        title={<Text style={styles.title}>과제 만들기</Text>}
        trailing={
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="과제 만들기 완료"
            onPress={() => void create()}
            disabled={busy}
          >
            <Text style={[styles.createAction, busy && styles.createActionDisabled]}>
              {busy ? "만드는 중…" : "만들기"}
            </Text>
          </TouchableOpacity>
        }
      />
      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.taskTitleLabel}>제목</Text>
        <SeugiTextField
          value={title}
          onChangeText={setTitle}
          clearable
          containerStyle={styles.editorField}
          editable={!busy}
        />
        <SeugiTextField
          value={content}
          onChangeText={setContent}
          containerStyle={styles.editorField}
          fieldStyle={styles.descriptionField}
          style={styles.descriptionInput}
          multiline
          textAlignVertical="top"
          editable={!busy}
        />
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => {
            setCalendarSelection(today);
            setCalendarOpen(true);
          }}
          style={styles.dateButton}
          disabled={busy}
        >
          <Text style={styles.dateText}>
            {Number(dueDate.slice(5, 7))}월 {Number(dueDate.slice(8, 10))}일까지
          </Text>
          <SeugiCalendarIcon />
        </TouchableOpacity>
        {notice ? (
          <Text
            accessibilityRole="alert"
            style={notice.includes("만들었") ? styles.answer : styles.error}
          >
            {notice}
          </Text>
        ) : null}
      </ScrollView>
      <Modal
        visible={calendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => closeCalendar(false)}
      >
        <View style={styles.dateModalBackdrop}>
          <View style={styles.dateDialog}>
            <View style={styles.monthHeader}>
              <Text style={styles.rowTitle}>
                {calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월
              </Text>
              <View style={styles.monthActions}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="이전 달"
                  onPress={() => shiftMonth(-1)}
                  style={styles.monthArrow}
                >
                  <Svg width={20} height={20} viewBox="0 0 24 24">
                    <Path
                      fill={SeugiColor.Primary500}
                      d="M16.604 19.707a1 1 0 0 1-1.415 0l-6.823-6.823a1.25 1.25 0 0 1 0-1.768l6.823-6.823a1 1 0 0 1 1.415 1.414L10.311 12l6.293 6.293a1 1 0 0 1 0 1.414"
                    />
                  </Svg>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="다음 달"
                  onPress={() => shiftMonth(1)}
                  style={styles.monthArrow}
                >
                  <Svg width={20} height={20} viewBox="0 0 24 24">
                    <Path
                      fill={SeugiColor.Primary500}
                      d="M8.293 4.293a1 1 0 0 1 1.414 0l6.823 6.823a1.25 1.25 0 0 1 0 1.768l-6.823 6.823a1 1 0 1 1-1.414-1.414L14.586 12 8.293 5.707a1 1 0 0 1 0-1.414"
                    />
                  </Svg>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.calendarGrid}>
              {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                <Text key={day} style={styles.weekday}>
                  {day}
                </Text>
              ))}
              {monthDays.map((date, index) => {
                if (!date) return <View key={`blank-${index}`} style={styles.calendarDay} />;
                const selectable = isTaskDateSelectable(date, today);
                const selected = calendarSelection === date;
                return (
                  <TouchableOpacity
                    key={date}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: !selectable }}
                    disabled={!selectable}
                    onPress={() => setCalendarSelection(date)}
                    style={styles.calendarDay}
                  >
                    {selected ? (
                      <View pointerEvents="none" style={styles.calendarDaySelected} />
                    ) : null}
                    <Text
                      style={[
                        styles.calendarDayText,
                        selected && styles.calendarDayTextSelected,
                        !selectable && styles.calendarDayTextDisabled,
                      ]}
                    >
                      {Number(date.slice(-2))}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Button
              label="선택"
              size="large"
              fullWidth
              style={styles.dateSelectButton}
              onPress={() => closeCalendar(true)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SeugiColor.Primary050 },
  form: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  back: { color: SeugiColor.Gray700, fontSize: 30, lineHeight: 34 },
  title: { color: SeugiColor.Gray800, fontSize: 18, fontWeight: "700" },
  createAction: {
    color: SeugiColor.White,
    backgroundColor: SeugiColor.Primary500,
    borderRadius: 14,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 14,
  },
  createActionDisabled: { opacity: 0.5 },
  taskTitleLabel: {
    color: SeugiColor.Gray800,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 4,
    marginBottom: 4,
  },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
  editorField: { marginBottom: 10 },
  answer: { backgroundColor: SeugiColor.Primary100, padding: 10, borderRadius: 8 },
  link: { color: SeugiColor.Primary500 },
  rowTitle: { fontWeight: "600" },
  descriptionField: { minHeight: 265, height: 265, alignItems: "flex-start" },
  descriptionInput: { minHeight: 265, paddingTop: 14, paddingBottom: 14, textAlignVertical: "top" },
  dateButton: {
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: SeugiColor.Gray400,
    backgroundColor: SeugiColor.White,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dateText: { color: SeugiColor.Gray800, fontWeight: "600" },
  dateModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.32)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  dateDialog: {
    width: "100%",
    maxWidth: 380,
    alignSelf: "center",
    backgroundColor: SeugiColor.White,
    borderRadius: 28,
    padding: 24,
  },
  monthHeader: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 4,
    marginBottom: 16,
  },
  monthActions: { flexDirection: "row", alignItems: "center", gap: 8, marginLeft: "auto" },
  monthArrow: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  weekday: {
    width: "14.285%",
    height: 18,
    textAlign: "center",
    textAlignVertical: "center",
    color: SeugiColor.Gray600,
    fontSize: 12,
  },
  calendarDay: {
    width: "14.285%",
    height: 34.33,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  calendarDaySelected: {
    position: "absolute",
    top: -9,
    left: "50%",
    marginLeft: -19,
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: SeugiColor.Primary500,
  },
  calendarDayText: { color: SeugiColor.Gray800 },
  calendarDayTextDisabled: { color: SeugiColor.Gray300 },
  calendarDayTextSelected: { color: SeugiColor.White, fontWeight: "700" },
  dateSelectButton: { marginBottom: 0 },
});
