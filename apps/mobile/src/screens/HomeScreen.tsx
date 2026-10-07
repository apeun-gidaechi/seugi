import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import Svg, { Path } from "react-native-svg";
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
import { HomeNoticesCard } from "../components/HomeNoticesCard";
import { SeugiTextField } from "../design-system/TextField";
import { api } from "../services/api";
import { localDateKey } from "../utils/date";

export type HomeDetail = "meals" | "timetable" | "tasks" | "catSeugi" | "workspace";

export function HomeScreen({
  workspace,
  refreshToken = 0,
  onOpenCatSeugi,
  onOpenMeals,
  onOpenTimetable,
  onOpenTasks,
  onOpenWorkspace,
  onOpenNotices,
  onCreateNotice,
  canCreateNotice,
}: {
  workspace: Workspace;
  refreshToken?: number;
  onOpenCatSeugi: () => void;
  onOpenMeals: () => void;
  onOpenTimetable: () => void;
  onOpenTasks: () => void;
  onOpenWorkspace: () => void;
  onOpenNotices: () => void;
  onCreateNotice: () => void;
  canCreateNotice: boolean;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [classroomTasks, setClassroomTasks] = useState<ClassroomTask[]>([]);
  const [timetable, setTimetable] = useState<Timetable[]>([]);
  const [meals, setMeals] = useState<Meal[]>();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [mealPage, setMealPage] = useState(0);
  const [mealPageWidth, setMealPageWidth] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshHome = useCallback(async () => {
    setRefreshing(true);
    const results = await Promise.allSettled([
      api.tasks(workspace.id),
      api.classroomTasks(),
      api.weeklyTimetable(workspace.id),
      api.meals(workspace.id),
      api.schedules(workspace.id),
    ]);
    if (results[0].status === "fulfilled") setTasks(results[0].value.data ?? []);
    if (results[1].status === "fulfilled") setClassroomTasks(results[1].value.data ?? []);
    if (results[2].status === "fulfilled") setTimetable(results[2].value.data ?? []);
    if (results[3].status === "fulfilled") setMeals(results[3].value.data ?? []);
    if (results[4].status === "fulfilled") setSchedules(results[4].value.data ?? []);
    setRefreshing(false);
  }, [workspace.id]);
  useEffect(() => {
    void refreshHome();
  }, [refreshHome, refreshToken]);

  const today = localDateKey(new Date());
  const todaysMeals = (meals ?? []).filter((item) => item.date.slice(0, 10) === today);
  const mealPages = Platform.OS === "android"
    ? ["조식", "중식", "석식"].map((type) => ({ type, meal: todaysMeals.find((item) => item.type === type) }))
    : todaysMeals.map((meal) => ({ type: meal.type, meal }));
  const todaysTimetable = timetable
    .filter((item) => item.date.slice(0, 10) === today)
    .sort((a, b) => Number(a.time) - Number(b.time));
  const selectedPeriod = Math.floor((Date.now() - new Date().setHours(8, 50, 0, 0)) / 3_600_000);
  const upcoming = schedules
    .filter((item) => item.date.slice(0, 10) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <ScrollView
      style={styles.homeContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshHome()} tintColor={SeugiColor.Primary500} colors={[SeugiColor.Primary500]} />}
    >
      <HomeCard title="내 학교" icon="school" onPress={Platform.OS === "ios" ? onOpenWorkspace : undefined}>
        {Platform.OS === "ios" ? <Text style={styles.workspaceName}>{workspace.name}</Text> : <View style={styles.schoolRow}>
          <Text style={styles.rowTitle}>{workspace.name}</Text>
          <Button label="전환" kind="secondary" onPress={onOpenWorkspace} />
        </View>}
      </HomeCard>
      <HomeCard title="오늘의 시간표" icon="timetable" onPress={onOpenTimetable}>
        {todaysTimetable.length ? (
          Platform.OS === "ios" ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iosPeriods}>
              {todaysTimetable.map((item, index) => {
                const period = Number(item.time) - 1;
                const current = selectedPeriod === period;
                const elapsed = selectedPeriod >= period;
                return <View key={item.id} style={styles.iosPeriod}>
                  <Text style={[styles.periodNumber, current && styles.periodNumberCurrent]}>{item.time}</Text>
                  <View style={[styles.periodSubject, elapsed && styles.periodSubjectElapsed, current && styles.periodSubjectCurrent, index === 0 && styles.periodFirst, index === todaysTimetable.length - 1 && styles.periodLast]}>
                    <Text numberOfLines={1} style={[styles.periodSubjectText, elapsed && styles.periodSubjectTextElapsed, current && styles.periodSubjectTextCurrent]}>{item.subject}</Text>
                  </View>
                </View>;
              })}
            </ScrollView>
          ) : (
            <View style={styles.androidPeriods}>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(1, Math.min(100, ((selectedPeriod + 0.9) / todaysTimetable.length) * 100))}%` }]} /></View>
              <View style={styles.periodRow}>{todaysTimetable.map((item, index) => {
                const current = selectedPeriod === Number(item.time) - 1;
                return <View key={item.id} style={styles.androidPeriod}>
                  <Text style={[styles.periodNumber, current && styles.periodNumberCurrent]}>{item.time}</Text>
                  <Text numberOfLines={1} style={[styles.periodSubjectText, current && styles.periodSubjectTextCurrent, index > selectedPeriod && styles.periodUpcoming]}>{item.subject}</Text>
                </View>;
              })}</View>
            </View>
          )
        ) : (
          <Text style={styles.muted}>학교를 등록하고 시간표를 확인하세요</Text>
        )}
      </HomeCard>
      <HomeNoticesCard workspace={workspace} canCreate={canCreateNotice} onOpen={onOpenNotices} onCreate={onCreateNotice} />
      <HomeCard title="오늘의 급식" icon="meal" onPress={onOpenMeals}>
        {meals === undefined ? <ActivityIndicator color={SeugiColor.Primary500} /> : mealPages.length ? <View onLayout={(event) => setMealPageWidth(event.nativeEvent.layout.width)}>
          {mealPageWidth > 0 ? <ScrollView horizontal pagingEnabled nestedScrollEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(event) => setMealPage(Math.round(event.nativeEvent.contentOffset.x / mealPageWidth))}>
            {mealPages.map(({ type, meal }, index) => <View key={`${today}-${type}`} style={[styles.mealPage, { width: mealPageWidth }]}>
              {meal ? <>
                <View style={styles.mealCardHeading}><Text style={styles.mealTypeBadge}>{Platform.OS === "android" ? type === "조식" ? "아침" : type === "중식" ? "점심" : type === "석식" ? "저녁" : type : type}</Text><Text style={styles.muted}>{meal.calorie}</Text></View>
                {Platform.OS === "android" ? Array.from({ length: Math.ceil(meal.menu.length / 2) }, (_, row) => <View key={row} style={styles.mealMenuRow}><Text style={styles.mealMenuColumn}>{meal.menu[row * 2]}</Text><Text style={styles.mealMenuColumn}>{meal.menu[row * 2 + 1] ?? ""}</Text></View>) : meal.menu.map((dish, dishIndex) => <Text key={`${dishIndex}-${dish}`} style={styles.mealMenuLine}>{dish}</Text>)}
              </> : <View style={styles.mealEmpty}><Text style={styles.mealSad}>☹</Text><Text style={styles.rowTitle}>급식이 없어요</Text></View>}
            </View>)}
          </ScrollView> : null}
          <View style={styles.mealPageTrack}><View style={[styles.mealPageIndicator, { width: Platform.OS === "android" ? 16 : 36 / mealPages.length, transform: [{ translateX: mealPage * (Platform.OS === "android" ? 10 : 36 / mealPages.length) }] }]} /></View>
        </View> : <Text style={styles.muted}>급식이 없어요</Text>}
      </HomeCard>
      <HomeCard title="캣스기" icon="cat">
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onOpenCatSeugi}
          style={styles.catPrompt}
        >
          <Text style={styles.muted}>2학년 4반에서 아무나 한명 뽑아줘...</Text>
          <Text style={styles.link}>⌕</Text>
        </TouchableOpacity>
      </HomeCard>
      <HomeCard title="다가오는 일정" icon="schedule">
        {upcoming.length ? (
          <View style={styles.homeList}>{upcoming.map((item) => {
            const days = daysUntil(today, item.date);
            return <View key={`${item.date}-${item.name}`} style={styles.homeCalendarRow}>
              <Text style={styles.homeCalendarDate}>{monthDay(item.date)}</Text>
              <Text numberOfLines={1} style={styles.homeCalendarTitle}>{item.name}</Text>
              <Text style={styles.homeCalendarDDay}>{days === 0 ? "D-Day" : `D-${days}`}</Text>
            </View>;
          })}</View>
        ) : (
          <Text style={styles.muted}>학교를 등록하고 일정을 확인하세요</Text>
        )}
      </HomeCard>
      <HomeCard title="다가오는 과제" icon="task" onPress={onOpenTasks}>
        {classroomTasks.length || tasks.length ? (
          <View style={styles.homeList}>{[...classroomTasks, ...tasks].map((item, index) => {
            const days = item.dueDate ? daysUntil(today, item.dueDate) : undefined;
            return <View key={`${"link" in item ? "classroom" : "task"}-${item.id}-${index}`} style={styles.homeCalendarRow}>
              <Text style={[styles.homeCalendarDate, !item.dueDate && styles.homeCalendarNoDate]}>{item.dueDate ? monthDay(item.dueDate) : "기한없음"}</Text>
              <Text numberOfLines={1} style={styles.homeCalendarTitle}>{item.title}</Text>
              <Text style={styles.homeCalendarDDay}>{days === undefined ? "기한없음" : days > 0 ? `D-${days}` : days < 0 ? `D+${Math.abs(days)}` : "D-Day"}</Text>
              {"link" in item && item.link ? (
                <TouchableOpacity onPress={() => Linking.openURL(item.link!).catch(() => undefined)}>
                  <Text style={styles.link}>과제 열기 ↗</Text>
                </TouchableOpacity>
              ) : null}
            </View>;
          })}</View>
        ) : (
          <Text style={styles.muted}>학교를 등록하고 과제를 확인하세요</Text>
        )}
      </HomeCard>
    </ScrollView>
  );
}

export { HomeScreen as Home };

function daysUntil(from: string, to: string) {
  const fromDate = new Date(`${from.slice(0, 10)}T00:00:00`);
  const toDate = new Date(`${to.slice(0, 10)}T00:00:00`);
  return Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000);
}

function monthDay(value: string) {
  const [, month = "", day = ""] = value.slice(0, 10).split("-");
  return `${Number(month)}/${day}`;
}

type HomeCardIcon = "school" | "timetable" | "meal" | "cat" | "schedule" | "task";
const homeCardPaths: Record<HomeCardIcon, string> = {
  school: "M3 10 12 4l9 6v10h-6v-6H9v6H3z M7 10h2v2H7zm8 0h2v2h-2z",
  timetable: "M4 4h16v16H4z M8 2v4m8-4v4M4 9h16M8 13h3m2 0h3m-8 3h3",
  meal: "M4 3v7m3-7v7m-3-4h3m3-3v7m0-4h3M16 3v18m0-18c3 2 4 5 4 8h-4",
  cat: "M4 10 3 5l5 2a11 11 0 0 1 8 0l5-2-1 5a8 8 0 1 1-16 0zm4 3h.01M16 13h.01M9 17q3 2 6 0",
  schedule: "M4 5h16v16H4z M8 3v4m8-4v4M4 10h16M8 14h3m2 0h3m-8 3h3",
  task: "M5 4h14v17H5z M8 9l1.5 1.5L12 8m1 2h3m-8 5 1.5 1.5L12 14m1 2h3",
};

function HomeCard({ title, icon, children, onPress }: { title: string; icon: HomeCardIcon; children: ReactNode; onPress?: () => void }) {
  return <View style={styles.homeCard}>
    <View style={styles.homeCardHeader}>
      <View style={styles.homeCardIcon}><Svg width={24} height={24} viewBox="0 0 24 24"><Path d={homeCardPaths[icon]} fill="none" stroke={SeugiColor.Gray600} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" /></Svg></View>
      {onPress ? <TouchableOpacity accessibilityRole="button" onPress={onPress} style={styles.homeCardTitleButton}><Text style={styles.homeCardTitle}>{title}</Text><Text style={styles.homeCardArrow}>›</Text></TouchableOpacity> : <Text style={styles.homeCardTitle}>{title}</Text>}
    </View>
    <View style={styles.homeCardBody}>{children}</View>
  </View>;
}

export function TimetableWeek({ entries, onSelectCell, onSelectEntry }: { entries: Timetable[]; onSelectCell?: (date: string, time: string) => void; onSelectEntry?: (entry: Timetable) => void }) {
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
      {(periods.length ? periods : ["1", "2", "3", "4", "5", "6", "7"]).map((period) => (
          <View key={period} style={rowStyle}>
            <Text style={periodStyle}>{period}</Text>
            {days.map((date) => (
              <TouchableOpacity
                key={`${date}-${period}`}
                style={cellStyle}
                onPress={() => {
                  const entry = entries.find((item) => item.date.slice(0, 10) === date && item.time === period);
                  if (entry) onSelectEntry?.(entry);
                  else onSelectCell?.(date, period);
                }}
              >
                <Text numberOfLines={2}>{subjectAt(date, period) || (onSelectCell ? "+" : "")}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
    </View>
  );
}

export function TimetablePage({ workspace }: { workspace: Workspace }) {
  const [entries, setEntries] = useState<Timetable[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [grade, setGrade] = useState("1");
  const [classNum, setClassNum] = useState("1");
  const [editing, setEditing] = useState<Timetable>();
  const [draft, setDraft] = useState("");
  const [slot, setSlot] = useState<{ date: string; time: string }>();
  const refresh = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const result = await api.weeklyTimetable(workspace.id, canEdit ? grade : undefined, canEdit ? classNum : undefined);
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
  }, [workspace.id, canEdit, grade, classNum]);
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 250);
    return () => clearTimeout(timer);
  }, [refresh]);
  useEffect(() => {
    let active = true;
    Promise.all([api.memberInfo(), api.myProfile(workspace.id)]).then(([member, profile]) => {
      if (!active) return;
      setCanEdit(workspace.ownerId === member.data?.id || ["ADMIN", "MIDDLE_ADMIN", "TEACHER"].includes(profile.data?.role ?? ""));
      if (profile.data?.grade && profile.data.grade > 0) setGrade(String(profile.data.grade));
      if (profile.data?.class && profile.data.class > 0) setClassNum(String(profile.data.class));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [workspace.id, workspace.ownerId]);
  const saveSubject = async () => {
    if (!draft.trim() || busy) return;
    if (slot && (![grade, classNum].every((value) => /^\d+$/.test(value)) || Number(grade) < 1 || Number(classNum) < 1)) {
      setError("학년과 반을 1 이상의 숫자로 입력해 주세요.");
      return;
    }
    setBusy(true); setError("");
    try {
      if (editing) await api.updateTimetable(editing.id, draft.trim());
      else if (slot) await api.createTimetable({ workspaceId: workspace.id, grade, classNum, time: slot.time, subject: draft.trim(), date: slot.date });
      setEditing(undefined); setSlot(undefined); setDraft(""); await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "시간표를 저장하지 못했습니다"); }
    finally { setBusy(false); }
  };
  const removeEntry = (entry: Timetable) => Alert.alert("시간표 삭제", `${entry.date} ${entry.time}교시 ${entry.subject}을(를) 삭제할까요?`, [
    { text: "취소", style: "cancel" },
    { text: "삭제", style: "destructive", onPress: () => { void api.deleteTimetable(entry.id).then(refresh).catch((reason) => setError(reason instanceof Error ? reason.message : "시간표를 삭제하지 못했습니다")); } },
  ]);
  return (
    <ScrollView style={styles.content}>
      <Card title="주간 시간표">
        <Text style={styles.muted}>월요일부터 금요일까지</Text>
        {busy ? <Text style={styles.muted}>시간표를 불러오는 중…</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {canEdit ? <View style={styles.manageRow}><SeugiTextField value={grade} onChangeText={(value) => setGrade(value.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" fieldStyle={styles.classField} style={styles.classInputText} accessibilityLabel="학년" /><Text style={styles.muted}>학년</Text><SeugiTextField value={classNum} onChangeText={(value) => setClassNum(value.replace(/\D/g, "").slice(0, 2))} keyboardType="number-pad" fieldStyle={styles.classField} style={styles.classInputText} accessibilityLabel="반" /><Text style={styles.muted}>반 · 빈 칸을 눌러 추가, 과목을 눌러 수정/삭제</Text></View> : null}
        <TimetableWeek entries={entries.filter((entry) => !canEdit || (entry.grade === grade && entry.classNum === classNum))} onSelectCell={canEdit ? (date, time) => { setSlot({ date, time }); setDraft(""); } : undefined} onSelectEntry={canEdit ? (entry) => { Alert.alert(entry.subject, `${entry.date} · ${entry.time}교시`, [{ text: "취소", style: "cancel" }, { text: "삭제", style: "destructive", onPress: () => removeEntry(entry) }, { text: "수정", onPress: () => { setEditing(entry); setDraft(entry.subject); } }]); } : undefined} />
        <Button
          label={busy ? "불러오는 중…" : "시간표 새로고침"}
          kind="secondary"
          onPress={() => void refresh()}
          disabled={busy}
        />
      </Card>
      <Modal visible={!!slot || !!editing} transparent animationType="fade" onRequestClose={() => { setSlot(undefined); setEditing(undefined); }}><View style={styles.timetableModal}><View style={styles.timetableDialog}><Text style={styles.dialogTitle}>{editing ? "시간표 수정" : "시간표 만들기"}</Text><Text style={styles.muted}>{editing ? `${editing.date} · ${editing.time}교시` : slot ? `${slot.date} · ${slot.time}교시 · ${grade}학년 ${classNum}반` : ""}</Text><SeugiTextField value={draft} onChangeText={setDraft} fieldStyle={styles.subjectField} placeholder="과목 이름" maxLength={120} /><View style={styles.modalActions}><Button label="취소" kind="secondary" onPress={() => { setSlot(undefined); setEditing(undefined); }} /><Button label={busy ? "저장 중…" : "완료"} onPress={() => void saveSubject()} disabled={busy || !draft.trim()} />{editing ? <Button label="삭제" kind="secondary" onPress={() => { removeEntry(editing); setEditing(undefined); }} /> : null}</View></View></View></Modal>
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
  // The native iOS and Android date pickers use a Sunday-first calendar.
  const leadingBlanks = new Date(year, monthNumber - 1, 1).getDay();
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
      data={selectedMeals.length ? [selectedMeals] : []}
      keyExtractor={() => selectedDate}
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
              {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
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
        </>
      }
      ListEmptyComponent={busy ? <Text style={styles.muted}>급식 정보를 불러오는 중…</Text> : error ? <Text style={styles.error}>{error}</Text> : <Text style={styles.muted}>급식이 없어요</Text>}
      renderItem={({ item: dayMeals }) => (
        <View style={styles.mealPanel}>
          {dayMeals.map((meal, mealIndex) => (
            <View key={`${meal.date}-${meal.type}`} style={mealIndex ? styles.mealSection : undefined}>
              <View style={styles.mealHeading}>
                <Text style={styles.mealType}>{meal.type}</Text>
                {meal.calorie ? <Text style={styles.muted}>{meal.calorie}</Text> : null}
              </View>
              {meal.menu.map((dish, index) => <Text key={`${index}-${dish}`}>{dish}</Text>)}
            </View>
          ))}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 16 },
  homeContent: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  homeCard: { backgroundColor: SeugiColor.White, borderRadius: 12, paddingTop: 12, paddingBottom: 16, marginBottom: 12 },
  homeCardHeader: { minHeight: 32, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16 },
  homeCardIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: SeugiColor.Gray100, alignItems: "center", justifyContent: "center" },
  homeCardTitle: { color: SeugiColor.Gray800, fontSize: 16, fontWeight: "600" },
  homeCardTitleButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  homeCardArrow: { color: SeugiColor.Gray500, fontSize: 24, lineHeight: 26 },
  homeCardBody: { paddingHorizontal: 12, paddingTop: 12 },
  mealPage: { paddingHorizontal: 4, minHeight: 72 },
  mealCardHeading: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  mealTypeBadge: { color: SeugiColor.White, backgroundColor: SeugiColor.Primary500, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, fontSize: 12 },
  mealMenuRow: { flexDirection: "row" },
  mealMenuColumn: { flex: 1, color: SeugiColor.Gray700, fontSize: 14, paddingVertical: 2 },
  mealMenuLine: { color: SeugiColor.Gray700, fontSize: 14 },
  mealEmpty: { minHeight: 72, alignItems: "center", justifyContent: "center", gap: 8 },
  mealSad: { color: SeugiColor.Gray500, fontSize: 28 },
  mealPageTrack: { width: 36, height: 6, borderRadius: 3, backgroundColor: SeugiColor.Gray300, alignSelf: "center", marginTop: 12, overflow: "hidden" },
  mealPageIndicator: { height: 6, borderRadius: 3, backgroundColor: SeugiColor.Primary500 },
  schoolRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  workspaceName: { color: SeugiColor.Gray600, fontSize: 16, fontWeight: "600", paddingVertical: 6.5 },
  homeList: { gap: 16 },
  homeCalendarRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  homeCalendarDate: { color: SeugiColor.Primary500, fontSize: 14 },
  homeCalendarNoDate: { color: SeugiColor.Gray600 },
  homeCalendarTitle: { flex: 1, minWidth: 0, color: SeugiColor.Gray800, fontSize: 14 },
  homeCalendarDDay: { color: SeugiColor.Gray600, fontSize: 12 },
  homeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  iosPeriods: { paddingRight: 8 },
  iosPeriod: { width: 80 },
  periodNumber: { color: SeugiColor.Primary300, fontSize: 14, textAlign: "center", paddingVertical: 8 },
  periodNumberCurrent: { color: SeugiColor.Primary500 },
  periodSubject: { height: 34, justifyContent: "center", paddingHorizontal: 8, backgroundColor: SeugiColor.Primary100 },
  periodSubjectElapsed: { backgroundColor: SeugiColor.Primary500 },
  periodSubjectCurrent: { borderTopRightRadius: 16, borderBottomRightRadius: 16 },
  periodFirst: { borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  periodLast: { borderTopRightRadius: 16, borderBottomRightRadius: 16 },
  periodSubjectText: { color: SeugiColor.Primary300, fontSize: 13, textAlign: "center" },
  periodSubjectTextElapsed: { color: SeugiColor.Primary200 },
  periodSubjectTextCurrent: { color: SeugiColor.White },
  periodUpcoming: { color: SeugiColor.Primary300 },
  androidPeriods: { minHeight: 52, justifyContent: "flex-end" },
  progressTrack: { position: "absolute", bottom: 0, left: 0, right: 0, height: 34, borderRadius: 23, backgroundColor: SeugiColor.Primary100, overflow: "hidden" },
  progressFill: { height: 34, borderRadius: 23, backgroundColor: SeugiColor.Primary500 },
  periodRow: { flexDirection: "row" },
  androidPeriod: { flex: 1, alignItems: "center" },
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
  manageRow: { flexDirection: "row", alignItems: "center", gap: 6, marginVertical: 10 },
  classField: { width: 42, minHeight: 40, height: 40, paddingHorizontal: 0, borderRadius: 8 },
  classInputText: { minHeight: 36, height: 36, paddingHorizontal: 4, paddingVertical: 4, textAlign: "center" },
  timetableModal: { flex: 1, justifyContent: "center", padding: 22, backgroundColor: "rgba(0,0,0,0.38)" },
  timetableDialog: { backgroundColor: SeugiColor.White, padding: 20, borderRadius: 16, gap: 12 },
  dialogTitle: { color: SeugiColor.Gray800, fontWeight: "700", fontSize: 18 },
  subjectField: { borderColor: SeugiColor.Gray300, borderRadius: 10 },
  modalActions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 8 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  mealPanel: { backgroundColor: SeugiColor.White, borderRadius: 18, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 16, marginTop: 8 },
  mealSection: { borderTopWidth: 1, borderTopColor: SeugiColor.Gray100, marginTop: 12, paddingTop: 12 },
  mealHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  mealType: { color: SeugiColor.Gray800, fontSize: 16, fontWeight: "600" },
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
