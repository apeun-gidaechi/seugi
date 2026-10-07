import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { SeugiApi } from "@seugi/api-client";
import { API_URL } from "../config";

const ACCESS_TOKEN_KEY = "seugi.access-token";
const WORKSPACE_ID_KEY = "seugi.workspace-id";

export async function refreshHomeWidgets() {
  if (Platform.OS === "android") {
    const { refreshSeugiWidgets } = require("./android");
    await refreshSeugiWidgets();
    return;
  }

  if (Platform.OS !== "ios") return;

  const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  const workspaceId = await SecureStore.getItemAsync(WORKSPACE_ID_KEY);
  let meals: unknown[] = [];
  let timetable: unknown[] = [];

  if (accessToken && workspaceId) {
    const api = new SeugiApi(API_URL, accessToken);
    try {
      const [mealResult, timetableResult] = await Promise.all([
        api.meals(workspaceId),
        api.timetable(workspaceId),
      ]);
      meals = mealResult.data ?? [];
      timetable = timetableResult.data ?? [];
    } catch {
      // Keep the previously shared snapshot when the API is temporarily unavailable.
      return;
    }
  }

  const { setWidgetData } = require("@bittingz/expo-widgets") as {
    setWidgetData: (data: string) => void;
  };
  setWidgetData(JSON.stringify({ meals, timetable }));
}
