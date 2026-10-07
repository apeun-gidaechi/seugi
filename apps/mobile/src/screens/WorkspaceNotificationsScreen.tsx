import { useEffect, useState } from "react";
import { Platform, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import { SeugiColor } from "@seugi/design-tokens";
import type { Workspace } from "@seugi/contracts";
import { api } from "../services/api";
import { EAS_PROJECT_ID, IOS_ALLOW_ALARM_KEY, IOS_DEVICE_TOKEN_KEY } from "../config";

export function WorkspaceNotificationsScreen({ workspace }: { workspace: Workspace }) {
  return (
    <View style={styles.screen}>
      <WorkspaceNotificationSettings workspace={workspace} />
    </View>
  );
}

function WorkspaceNotificationSettings({ workspace }: { workspace: Workspace }) {
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
        let token = await SecureStore.getItemAsync(IOS_DEVICE_TOKEN_KEY);
        if (!token && EAS_PROJECT_ID) {
          token = (await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID })).data;
          await SecureStore.setItemAsync(IOS_DEVICE_TOKEN_KEY, token);
        }
        if (token && next) await api.registerDeviceToken(token);
        else if (token) await api.removeDeviceToken(token);
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
      <TouchableOpacity
        accessibilityRole="switch"
        accessibilityState={{ checked: enabled, disabled: busy }}
        onPress={() => void toggle(!enabled)}
        disabled={busy}
        style={styles.row}
      >
        <Text style={styles.label}>전체 알림 허용</Text>
        <Switch
          value={enabled}
          onValueChange={(next) => void toggle(next)}
          disabled={busy}
          trackColor={{ false: SeugiColor.Gray300, true: SeugiColor.Primary300 }}
          thumbColor={enabled ? SeugiColor.Primary500 : SeugiColor.White}
        />
      </TouchableOpacity>
      {notice ? <Text style={styles.error}>{notice}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SeugiColor.White },
  settings: { flex: 1, paddingTop: 6 },
  row: { minHeight: 56, paddingHorizontal: 20, paddingVertical: 12, flexDirection: "row", alignItems: "center" },
  label: { color: SeugiColor.Gray800, fontSize: 15, fontWeight: "600", flex: 1 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
});
