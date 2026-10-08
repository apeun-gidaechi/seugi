import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import { SeugiColor } from "@seugi/design-tokens";
import type { Workspace } from "@seugi/contracts";
import { api } from "../services/api";
import { EAS_PROJECT_ID, IOS_ALLOW_ALARM_KEY, IOS_DEVICE_TOKEN_KEY } from "../config";
import { SeugiToggle } from "../design-system/Toggle";
import { notificationTokenAction } from "../utils/notificationTokenAction";

export function WorkspaceNotificationsScreen({ workspace, deviceToken, onDeviceTokenChange }: { workspace: Workspace; deviceToken?: string; onDeviceTokenChange?: (token?: string) => void }) {
  return (
    <View style={styles.screen}>
      <WorkspaceNotificationSettings workspace={workspace} deviceToken={deviceToken} onDeviceTokenChange={onDeviceTokenChange} />
    </View>
  );
}

function WorkspaceNotificationSettings({ workspace, deviceToken, onDeviceTokenChange }: { workspace: Workspace; deviceToken?: string; onDeviceTokenChange?: (token?: string) => void }) {
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const load = Platform.OS === "ios"
      ? SecureStore.getItemAsync(IOS_ALLOW_ALARM_KEY).then((value) => value !== "false")
      : api.workspaceNotificationPreference(workspace.id).then((result) => result.data ?? true);
    load
      .then((value) => { if (active) setEnabled(value); })
      .catch((error) => active && setNotice(error instanceof Error ? error.message : "알림 설정을 불러오지 못했습니다"));
    return () => { active = false; };
  }, [workspace.id]);

  const toggle = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      if (Platform.OS === "ios") {
        await SecureStore.setItemAsync(IOS_ALLOW_ALARM_KEY, String(next));
        setEnabled(next);
        const savedToken = await SecureStore.getItemAsync(IOS_DEVICE_TOKEN_KEY);
        let token = savedToken ?? deviceToken;
        const action = notificationTokenAction(next, token, !!EAS_PROJECT_ID);
        if (action === "request-and-register") {
          if (!EAS_PROJECT_ID) return;
          token = (await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID })).data;
          await SecureStore.setItemAsync(IOS_DEVICE_TOKEN_KEY, token);
        }
        if ((action === "register" || action === "request-and-register") && token) {
          onDeviceTokenChange?.(token);
          await api.registerDeviceToken(token);
        } else if (action === "remove" && token) {
          await api.removeDeviceToken(token);
          onDeviceTokenChange?.(undefined);
        }
      } else {
        const result = await api.setWorkspaceNotificationPreference(workspace.id, next);
        setEnabled(result.data ?? next);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "알림 설정을 저장하지 못했습니다");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.settings}>
      <View style={styles.row}>
        {Platform.OS === "android" ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="전체 알림 허용"
            accessibilityState={{ disabled: busy }}
            onPress={() => void toggle(!enabled)}
            disabled={busy}
            style={styles.labelAction}
          >
            <Text style={styles.label}>전체 알림 허용</Text>
          </TouchableOpacity>
        ) : <Text style={styles.label}>전체 알림 허용</Text>}
        <SeugiToggle
          accessibilityLabel="전체 알림 허용"
          value={enabled}
          onValueChange={(next) => void toggle(next)}
          disabled={busy}
        />
      </View>
      {notice ? <Text style={styles.error}>{notice}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SeugiColor.White },
  settings: { flex: 1, paddingTop: 6 },
  row: { minHeight: 56, paddingHorizontal: 20, paddingVertical: 12, flexDirection: "row", alignItems: "center" },
  labelAction: { flex: 1, alignSelf: "stretch", justifyContent: "center" },
  label: { color: SeugiColor.Gray800, fontSize: 15, fontWeight: "600", flex: 1 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
});
