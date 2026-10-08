import { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import { SeugiSearchIcon } from "../design-system/SearchIcon";
import { HomeCard } from "../components/HomeCard";
import { SeugiEmptyState } from "../design-system/EmptyState";
import { SeugiLoadingIndicator } from "../design-system/LoadingIndicator";
import type { ClassroomTask, Meal, Schedule, Task, Timetable, Workspace } from "@seugi/contracts";
import { Button, Card } from "../components/ui";
import { HomeAssignmentsCard } from "../components/HomeAssignmentsCard";
import { SeugiTextField } from "../design-system/TextField";
import { api } from "../services/api";
import { localDateKey } from "../utils/date";
import { initialHomeMealPage, shouldLoadClassroomTasks } from "../utils/home";
import {
  getCurrentTimetablePeriod,
  homeMealPages,
  homeMealTypeLabel,
  homeScheduleDaysUntil,
  homeScheduleMonthDay,
  homeTodaysMeals,
  homeTodaysTimetable,
  homeUpcomingSchedules,
  homeAssignmentsLoadFailed,
} from "../utils/homeScreenData";
import { refreshHomeWidgets } from "../widgets/refresh";
import { nativePlatform } from "../utils/platform";

export type HomeDetail = "meals" | "timetable" | "tasks" | "catSeugi" | "workspace";

export function HomeScreen({
  workspace,
  refreshToken = 0,
  onOpenCatSeugi,
  onOpenMeals,
  onOpenTimetable,
  onOpenTasks,
  onOpenWorkspace,
}: {
  workspace: Workspace;
  refreshToken?: number;
  onOpenCatSeugi: () => void;
  onOpenMeals: () => void;
  onOpenTimetable: () => void;
  onOpenTasks: () => void;
  onOpenWorkspace: () => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [classroomTasks, setClassroomTasks] = useState<ClassroomTask[]>([]);
  const [timetable, setTimetable] = useState<Timetable[]>([]);
  const [timetableLoading, setTimetableLoading] = useState(true);
  const [timetableError, setTimetableError] = useState(false);
  const [meals, setMeals] = useState<Meal[]>();
  const [mealError, setMealError] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState(false);
  const [initialMealPage] = useState(() => initialHomeMealPage(new Date(), nativePlatform()));
  const [mealPage, setMealPage] = useState(initialMealPage);
  const [mealPageWidth, setMealPageWidth] = useState(0);
  const mealPagerRef = useRef<ScrollView>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignmentError, setAssignmentError] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<number | null>(null);
  const [allPeriodsOver, setAllPeriodsOver] = useState(false);
  const refreshHome = useCallback(async () => {
    setRefreshing(true);
    setAssignmentsLoading(true);
    setScheduleLoading(true);
    setTimetableLoading(true);
    const classroomTasksRequest = shouldLoadClassroomTasks(Platform.OS)
      ? api.classroomTasks()
      : Promise.resolve({ data: [] as ClassroomTask[] });
    const results = await Promise.allSettled([
      api.tasks(workspace.id),
      classroomTasksRequest,
      api.weeklyTimetable(workspace.id),
      api.mealForDate(workspace.id, localDateKey(new Date())),
      api.schedulesForMonth(workspace.id, new Date().getMonth() + 1),
    ]);
    if (results[0].status === "fulfilled") setTasks(results[0].value.data ?? []);
    if (results[1].status === "fulfilled") setClassroomTasks(results[1].value.data ?? []);
    if (results[2].status === "fulfilled") setTimetable(results[2].value.data ?? []);
    else setTimetable([]);
    setTimetableError(results[2].status === "rejected");
    setTimetableLoading(false);
    if (results[3].status === "fulfilled") setMeals(results[3].value.data ?? []);
    else setMeals(undefined);
    setMealError(results[3].status === "rejected");
    if (results[4].status === "fulfilled") setSchedules(results[4].value.data ?? []);
    else setSchedules([]);
    setScheduleError(results[4].status === "rejected");
    setScheduleLoading(false);
    setAssignmentError(
      homeAssignmentsLoadFailed(
        nativePlatform(),
        results[0].status === "rejected",
        results[1].status === "rejected",
      ),
    );
    setAssignmentsLoading(false);
    setRefreshing(false);
    void refreshHomeWidgets().catch(() => undefined);
  }, [workspace.id]);
  useEffect(() => {
    void refreshHome();
  }, [refreshHome, refreshToken]);
  const today = localDateKey(new Date());
  const todaysMeals = homeTodaysMeals(meals, today);
  const mealPages = homeMealPages(todaysMeals, nativePlatform());
  useEffect(() => {
    if (Platform.OS !== "android" || mealPageWidth <= 0 || mealPages.length === 0) return;
    requestAnimationFrame(() =>
      mealPagerRef.current?.scrollTo({ x: initialMealPage * mealPageWidth, y: 0, animated: false }),
    );
  }, [initialMealPage, mealPageWidth, mealPages.length]);
  const todaysTimetable = homeTodaysTimetable(timetable, today);
  const upcoming = homeUpcomingSchedules(schedules, today, nativePlatform());

  useEffect(() => {
    const updatePeriod = () => {
      const state = getCurrentTimetablePeriod(todaysTimetable);
      setCurrentPeriod(state.period);
      setAllPeriodsOver(state.allPeriodsOver);
    };
    updatePeriod();
  }, [timetable]);

  return (
    <ScrollView
      style={styles.homeContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void refreshHome()}
          tintColor={SeugiColor.Primary500}
          colors={[SeugiColor.Primary500]}
        />
      }
    >
      <HomeCard
        title="내 학교"
        icon="school"
        onPress={Platform.OS === "ios" ? onOpenWorkspace : undefined}
      >
        {Platform.OS === "ios" ? (
          <Text style={styles.workspaceName}>{workspace.name}</Text>
        ) : (
          <View style={styles.schoolRow}>
            <Text style={styles.rowTitle}>{workspace.name}</Text>
            <Button label="전환" kind="secondary" onPress={onOpenWorkspace} />
          </View>
        )}
      </HomeCard>
      <HomeCard title="오늘의 시간표" icon="timetable" onPress={onOpenTimetable}>
        {timetableLoading || (Platform.OS === "android" && timetableError) ? (
          <SeugiLoadingIndicator />
        ) : timetableError ? (
          <Text style={styles.muted}>학교를 등록하고 시간표를 확인하세요</Text>
        ) : todaysTimetable.length ? (
          Platform.OS === "ios" ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.iosPeriods}
            >
              {todaysTimetable.map((item, index) => {
                const period = Number(item.time) - 1;
                const current = currentPeriod === period + 1;
                const elapsed =
                  allPeriodsOver || (currentPeriod !== null && currentPeriod > period + 1);
                return (
                  <View key={item.id} style={styles.iosPeriod}>
                    <Text style={[styles.periodNumber, current && styles.periodNumberCurrent]}>
                      {item.time}
                    </Text>
                    <View
                      style={[
                        styles.periodSubject,
                        elapsed && styles.periodSubjectElapsed,
                        current && styles.periodSubjectCurrent,
                        index === 0 && styles.periodFirst,
                        index === todaysTimetable.length - 1 && styles.periodLast,
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.periodSubjectText,
                          elapsed && styles.periodSubjectTextElapsed,
                          current && styles.periodSubjectTextCurrent,
                        ]}
                      >
                        {item.subject}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.androidPeriods}>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${allPeriodsOver ? 100 : Math.max(1, Math.min(100, (((currentPeriod ?? 0) - 0.1) / todaysTimetable.length) * 100))}%`,
                    },
                  ]}
                />
              </View>
              <View style={styles.periodRow}>
                {todaysTimetable.map((item, index) => {
                  const period = index + 1;
                  const current = currentPeriod === period;
                  return (
                    <View key={item.id} style={styles.androidPeriod}>
                      <Text style={[styles.periodNumber, current && styles.periodNumberCurrent]}>
                        {item.time}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.periodSubjectText,
                          current && styles.periodSubjectTextCurrent,
                          !allPeriodsOver &&
                            currentPeriod !== null &&
                            period > currentPeriod &&
                            styles.periodUpcoming,
                        ]}
                      >
                        {item.subject}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )
        ) : (
          <Text style={styles.muted}>
            {Platform.OS === "ios" ? "시간표가 없어요" : "학교를 등록하고 시간표를 확인하세요"}
          </Text>
        )}
      </HomeCard>
      <HomeCard title="오늘의 급식" icon="meal" onPress={onOpenMeals}>
        {meals === undefined && Platform.OS === "ios" && mealError ? (
          <Text style={styles.muted}>학교를 등록하고 급식을 확인하세요</Text>
        ) : meals === undefined ? (
          <SeugiLoadingIndicator />
        ) : mealPages.length ? (
          <View onLayout={(event) => setMealPageWidth(event.nativeEvent.layout.width)}>
            {mealPageWidth > 0 ? (
              <ScrollView
                ref={mealPagerRef}
                horizontal
                pagingEnabled
                nestedScrollEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) =>
                  setMealPage(Math.round(event.nativeEvent.contentOffset.x / mealPageWidth))
                }
              >
                {mealPages.map(({ type, meal }, index) => (
                  <View
                    key={`${today}-${type}`}
                    style={[styles.mealPage, { width: mealPageWidth }]}
                  >
                    {meal ? (
                      <>
                        <View style={styles.mealCardHeading}>
                          <Text style={styles.mealTypeBadge}>
                            {homeMealTypeLabel(type, nativePlatform())}
                          </Text>
                          <Text style={styles.muted}>{meal.calorie}</Text>
                        </View>
                        {Platform.OS === "android"
                          ? Array.from({ length: Math.ceil(meal.menu.length / 2) }, (_, row) => (
                              <View key={row} style={styles.mealMenuRow}>
                                <Text style={styles.mealMenuColumn}>{meal.menu[row * 2]}</Text>
                                <Text style={styles.mealMenuColumn}>
                                  {meal.menu[row * 2 + 1] ?? ""}
                                </Text>
                              </View>
                            ))
                          : meal.menu.map((dish, dishIndex) => (
                              <Text key={`${dishIndex}-${dish}`} style={styles.mealMenuLine}>
                                {dish}
                              </Text>
                            ))}
                      </>
                    ) : (
                      <SeugiEmptyState title="급식이 없어요" style={styles.mealEmpty} />
                    )}
                  </View>
                ))}
              </ScrollView>
            ) : null}
            <View style={styles.mealPageTrack}>
              <View
                style={[
                  styles.mealPageIndicator,
                  {
                    width: Platform.OS === "android" ? 16 : 36 / mealPages.length,
                    transform: [
                      {
                        translateX:
                          mealPage * (Platform.OS === "android" ? 10 : 36 / mealPages.length),
                      },
                    ],
                  },
                ]}
              />
            </View>
          </View>
        ) : (
          <Text style={styles.muted}>급식이 없어요</Text>
        )}
      </HomeCard>
      <HomeCard title="캣스기" icon="cat">
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onOpenCatSeugi}
          style={styles.catPrompt}
        >
          <Text style={styles.muted}>2학년 4반에서 아무나 한명 뽑아줘...</Text>
          <SeugiSearchIcon size={28} color={SeugiColor.Primary500} />
        </TouchableOpacity>
      </HomeCard>
      <HomeCard title="다가오는 일정" icon="schedule">
        {scheduleLoading ? (
          <SeugiLoadingIndicator />
        ) : upcoming.length ? (
          <View style={styles.homeList}>
            {upcoming.map((item) => {
              const days = homeScheduleDaysUntil(today, item.date);
              return (
                <View key={`${item.date}-${item.name}`} style={styles.homeCalendarRow}>
                  <Text style={styles.homeCalendarDate}>{homeScheduleMonthDay(item.date)}</Text>
                  <Text numberOfLines={1} style={styles.homeCalendarTitle}>
                    {item.name}
                  </Text>
                  <Text style={styles.homeCalendarDDay}>{days === 0 ? "D-Day" : `D-${days}`}</Text>
                </View>
              );
            })}
          </View>
        ) : scheduleError && Platform.OS === "ios" ? (
          <Text style={styles.muted}>학교를 등록하고 일정을 확인하세요</Text>
        ) : Platform.OS === "ios" && schedules.length > 0 ? null : (
          <Text style={styles.muted}>일정이 없어요</Text>
        )}
      </HomeCard>
      <HomeAssignmentsCard
        tasks={tasks}
        classroomTasks={classroomTasks}
        loading={assignmentsLoading}
        error={assignmentError}
        onOpen={onOpenTasks}
      />
    </ScrollView>
  );
}

export function NoWorkspaceHome({
  onRegister,
  onRequests,
}: {
  onRegister: () => void;
  onRequests: () => void;
}) {
  return (
    <ScrollView style={styles.homeContent} contentContainerStyle={styles.noWorkspaceHome}>
      <HomeCard
        title="내 학교"
        icon="school"
        onPress={Platform.OS === "ios" ? onRegister : undefined}
      >
        {Platform.OS === "android" ? (
          <SeugiLoadingIndicator />
        ) : (
          <Text style={styles.muted}>내 학교를 등록해주세요</Text>
        )}
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onRegister}
          style={styles.noWorkspaceRegister}
        >
          <Text style={styles.link}>학교 등록하기</Text>
        </TouchableOpacity>
      </HomeCard>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={onRequests}
        style={styles.noWorkspaceRequest}
      >
        <Text style={styles.link}>가입 신청 내역 확인</Text>
      </TouchableOpacity>
      <HomeCard title="오늘의 시간표" icon="timetable" onPress={onRegister}>
        {Platform.OS === "android" ? (
          <Text style={styles.noWorkspaceMessage}>학교를 등록하고 시간표를 확인하세요</Text>
        ) : (
          <SeugiLoadingIndicator />
        )}
      </HomeCard>
      <HomeCard title="오늘의 급식" icon="meal" onPress={onRegister}>
        {Platform.OS === "android" ? (
          <Text style={styles.noWorkspaceMessage}>학교를 등록하고 급식을 확인하세요</Text>
        ) : (
          <SeugiLoadingIndicator />
        )}
      </HomeCard>
      <HomeCard title="캣스기" icon="cat">
        <Text style={styles.noWorkspaceMessage}>학교를 등록하고 캣스기와 대화해 보세요</Text>
      </HomeCard>
      <HomeCard title="다가오는 일정" icon="schedule">
        {Platform.OS === "android" ? (
          <Text style={styles.noWorkspaceMessage}>일정이 없어요</Text>
        ) : (
          <SeugiLoadingIndicator />
        )}
      </HomeCard>
      <HomeCard
        title={Platform.OS === "ios" ? "다가오는 과제" : "과제"}
        icon="task"
        onPress={onRegister}
      >
        <SeugiLoadingIndicator />
      </HomeCard>
    </ScrollView>
  );
}

export { HomeScreen as Home };

const styles = StyleSheet.create({
  homeContent: { flex: 1, paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 8 : 0 },
  noWorkspaceHome: { paddingBottom: 32 },
  noWorkspaceMessage: {
    color: SeugiColor.Gray600,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 12,
  },
  noWorkspaceRegister: { alignSelf: "flex-end", paddingTop: 4 },
  noWorkspaceRequest: { alignSelf: "flex-end", paddingHorizontal: 8, paddingBottom: 8 },
  mealPage: { paddingHorizontal: 4, minHeight: 72 },
  mealCardHeading: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  mealTypeBadge: {
    color: SeugiColor.White,
    backgroundColor: SeugiColor.Primary500,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    fontSize: 12,
  },
  mealMenuRow: { flexDirection: "row" },
  mealMenuColumn: { flex: 1, color: SeugiColor.Gray700, fontSize: 14, paddingVertical: 2 },
  mealMenuLine: { color: SeugiColor.Gray700, fontSize: 14 },
  mealEmpty: { minHeight: 72, alignItems: "center", justifyContent: "center", gap: 8 },
  mealPageTrack: {
    width: 36,
    height: 6,
    borderRadius: 3,
    backgroundColor: SeugiColor.Gray300,
    alignSelf: "center",
    marginTop: 12,
    overflow: "hidden",
  },
  mealPageIndicator: { height: 6, borderRadius: 3, backgroundColor: SeugiColor.Primary500 },
  schoolRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  workspaceName: {
    color: SeugiColor.Gray600,
    fontSize: 16,
    fontWeight: "600",
    paddingVertical: 6.5,
  },
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
  periodNumber: {
    color: SeugiColor.Primary300,
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 8,
  },
  periodNumberCurrent: { color: SeugiColor.Primary500 },
  periodSubject: {
    height: 34,
    justifyContent: "center",
    paddingHorizontal: 8,
    backgroundColor: SeugiColor.Primary100,
  },
  periodSubjectElapsed: { backgroundColor: SeugiColor.Primary500 },
  periodSubjectCurrent: { borderTopRightRadius: 16, borderBottomRightRadius: 16 },
  periodFirst: { borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  periodLast: { borderTopRightRadius: 16, borderBottomRightRadius: 16 },
  periodSubjectText: { color: SeugiColor.Primary300, fontSize: 13, textAlign: "center" },
  periodSubjectTextElapsed: { color: SeugiColor.Primary200 },
  periodSubjectTextCurrent: { color: SeugiColor.White },
  periodUpcoming: { color: SeugiColor.Primary300 },
  androidPeriods: { minHeight: 52, justifyContent: "flex-end" },
  progressTrack: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 34,
    borderRadius: 23,
    backgroundColor: SeugiColor.Primary100,
    overflow: "hidden",
  },
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
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
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
