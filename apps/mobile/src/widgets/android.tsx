import React from "react";
import * as SecureStore from "expo-secure-store";
import {
  FlexWidget,
  TextWidget,
  type WidgetTaskHandlerProps,
  registerWidgetTaskHandler,
  requestWidgetUpdate,
} from "react-native-android-widget";
import { SeugiApi } from "@seugi/api-client";
import { SeugiColor } from "@seugi/design-tokens";
import type { Meal, Timetable } from "@seugi/contracts";
import { API_URL } from "../config";

const ACCESS_TOKEN_KEY = "seugi.access-token";
const REFRESH_TOKEN_KEY = "seugi.refresh-token";
const WORKSPACE_ID_KEY = "seugi.workspace-id";

const dateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

async function authenticatedApi() {
  const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  const api = new SeugiApi(API_URL, accessToken ?? undefined);
  if (!accessToken) return { api, workspaceId: undefined };

  try {
    const workspaces = (await api.workspaces()).data ?? [];
    const preferredId = await SecureStore.getItemAsync(WORKSPACE_ID_KEY);
    const workspace = workspaces.find((item) => item.id === preferredId) ?? workspaces[0];
    if (workspace && !preferredId) await SecureStore.setItemAsync(WORKSPACE_ID_KEY, workspace.id);
    return { api, workspaceId: workspace?.id };
  } catch {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) return { api, workspaceId: undefined };
    try {
      const refreshed = await api.refreshAccessToken(refreshToken);
      if (!refreshed.data) return { api, workspaceId: undefined };
      api.setToken(refreshed.data);
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, refreshed.data);
      const workspaces = (await api.workspaces()).data ?? [];
      const preferredId = await SecureStore.getItemAsync(WORKSPACE_ID_KEY);
      const workspace = workspaces.find((item) => item.id === preferredId) ?? workspaces[0];
      if (workspace && !preferredId) await SecureStore.setItemAsync(WORKSPACE_ID_KEY, workspace.id);
      return { api, workspaceId: workspace?.id };
    } catch {
      return { api, workspaceId: undefined };
    }
  }
}

function WidgetShell({ children }: { children: React.ReactNode }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        width: "match_parent",
        height: "match_parent",
        flexDirection: "column",
        backgroundColor: SeugiColor.Gray100,
        borderRadius: 22,
        padding: 10,
        flexGap: 7,
      }}
    >
      {children}
    </FlexWidget>
  );
}

function WidgetHeader({ title, trailing }: { title: string; trailing?: string }) {
  return (
    <FlexWidget
      style={{
        width: "match_parent",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <TextWidget
        text={title}
        style={{ color: SeugiColor.White, backgroundColor: SeugiColor.Primary500, fontSize: 13, fontWeight: "bold", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 }}
      />
      {trailing ? <TextWidget text={trailing} style={{ color: SeugiColor.Gray600, fontSize: 11 }} /> : null}
    </FlexWidget>
  );
}

function MealWidget({ meal, label, status }: { meal?: Meal; label: string; status?: string }) {
  return (
    <WidgetShell>
      <WidgetHeader title={label} trailing={meal?.calorie} />
      <FlexWidget style={{ width: "match_parent", flex: 1, flexDirection: "column", backgroundColor: SeugiColor.White, borderRadius: 18, padding: 10, flexGap: 3 }}>
        {meal?.menu.length ? meal.menu.slice(0, 7).map((item, index) => <TextWidget key={`${index}-${item}`} text={item} maxLines={1} style={{ color: SeugiColor.Gray800, fontSize: 13 }} />) : <TextWidget text={status ?? "급식이 존재하지 않습니다."} maxLines={3} style={{ color: SeugiColor.Gray600, fontSize: 13 }} />}
      </FlexWidget>
    </WidgetShell>
  );
}

function TimetableWidget({ entries, date, status }: { entries: Timetable[]; date: Date; status?: string }) {
  return (
    <WidgetShell>
      <WidgetHeader title="시간표" trailing={`${date.getMonth() + 1}.${date.getDate()}`} />
      <FlexWidget style={{ width: "match_parent", flex: 1, flexDirection: "column", backgroundColor: SeugiColor.White, borderRadius: 18, padding: 10, flexGap: 3 }}>
        {entries.length ? entries.slice(0, 8).map((item, index) => <TextWidget key={item.id || `${item.time}-${index}`} text={`${item.time}교시 : ${item.subject}`} maxLines={1} style={{ color: SeugiColor.Gray800, fontSize: 13 }} />) : <TextWidget text={status ?? "시간표가 존재하지 않습니다."} maxLines={3} style={{ color: SeugiColor.Gray600, fontSize: 13 }} />}
      </FlexWidget>
    </WidgetShell>
  );
}

function mealPeriod(date: Date) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes < 8 * 60 + 10) return { type: "조식", label: "아침" };
  if (minutes < 13 * 60 + 30) return { type: "중식", label: "점심" };
  return { type: "석식", label: "저녁" };
}

async function createWidget(widgetName: string): Promise<React.ReactElement> {
  const now = new Date();
  const { api, workspaceId } = await authenticatedApi();
  if (!workspaceId) {
    const status = "스기에 로그인하고 워크스페이스를 설정해 주세요.";
    return widgetName === "SeugiMealWidget"
      ? <MealWidget label="오늘 급식" status={status} />
      : <TimetableWidget entries={[]} date={now} status={status} />;
  }

  if (widgetName === "SeugiMealWidget") {
    const { label, type } = mealPeriod(now);
    try {
      const meals = (await api.meals(workspaceId, now.getFullYear(), now.getMonth() + 1)).data ?? [];
      const meal = meals.find((item) => item.date.slice(0, 10) === dateKey(now) && item.type.includes(type));
      return <MealWidget meal={meal} label={label} />;
    } catch {
      return <MealWidget label={label} status="급식 정보를 불러오지 못했습니다." />;
    }
  }
  if (widgetName === "SeugiTimetableWidget") {
    try {
      const entries = ((await api.timetable(workspaceId)).data ?? [])
        .filter((item) => item.date.slice(0, 10) === dateKey(now))
        .sort((a, b) => Number(a.time) - Number(b.time));
      return <TimetableWidget entries={entries} date={now} />;
    } catch {
      return <TimetableWidget entries={[]} date={now} status="시간표를 불러오지 못했습니다." />;
    }
  }
  return <TimetableWidget entries={[]} date={now} status="시간표를 사용할 수 없습니다." />;
}

export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === "WIDGET_DELETED") return;
  renderWidget(await createWidget(widgetInfo.widgetName));
}

export function registerSeugiWidgetTask() {
  registerWidgetTaskHandler(widgetTaskHandler);
}

export async function refreshSeugiWidgets() {
  await Promise.all([
    requestWidgetUpdate({ widgetName: "SeugiMealWidget", renderWidget: () => createWidget("SeugiMealWidget") }),
    requestWidgetUpdate({ widgetName: "SeugiTimetableWidget", renderWidget: () => createWidget("SeugiTimetableWidget") }),
  ]);
}
