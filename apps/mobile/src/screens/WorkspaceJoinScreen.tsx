import { useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { WorkspaceSearchSummary } from "@seugi/contracts";
import { type WorkspaceJoinRole } from "../components/ui";
import { SeugiTopBar } from "../design-system/TopBar";
import { SeugiBackIcon } from "../design-system/BackIcon";
import { WorkspaceRoleSelection } from "../components/WorkspaceRoleSelection";
import { WorkspaceJoinConfirmation } from "../components/WorkspaceJoinConfirmation";
import { WorkspaceJoinCodeScreen } from "./WorkspaceJoinCodeScreen";
import { WorkspaceApprovalScreen } from "./WorkspaceApprovalScreen";
import { api } from "../services/api";
import { joinWorkspaceThenShowWaiting } from "../utils/workspaceJoin";
import {
  workspaceJoinFailureFeedback,
  type WorkspaceJoinFailure,
} from "../utils/workspaceJoinFeedback";
import { nativePlatform } from "../utils/platform";

export function WorkspaceJoinScreen({
  step,
  onReload,
  onNavigate,
  onBack,
  onDone,
}: {
  step: "role" | "code" | "confirm" | "waiting";
  onReload: () => Promise<void>;
  onNavigate: (
    route: "workspaceJoinCode" | "workspaceJoinConfirm" | "workspaceJoinWaiting",
  ) => void;
  onBack: () => void;
  onDone: () => void;
}) {
  const [inviteCode, setInviteCode] = useState("");
  const [joinRole, setJoinRole] = useState<WorkspaceJoinRole>("STUDENT");
  const [workspace, setWorkspace] = useState<WorkspaceSearchSummary>();
  const [busy, setBusy] = useState(false);
  const showFailure = (failure: WorkspaceJoinFailure, reason: unknown) => {
    const serverMessage = reason instanceof Error ? reason.message : undefined;
    const feedback = workspaceJoinFailureFeedback(nativePlatform(), failure, serverMessage);
    if (Platform.OS === "ios") Alert.alert(feedback.title, feedback.message);
    else ToastAndroid.show(feedback.title, ToastAndroid.SHORT);
  };
  const search = async () => {
    if (inviteCode.trim().length !== 6 || busy) return;
    setBusy(true);
    try {
      const result = await api.searchWorkspace(inviteCode.trim().toUpperCase());
      setWorkspace(result.data);
      onNavigate("workspaceJoinConfirm");
    } catch (error) {
      showFailure("search", error);
    } finally {
      setBusy(false);
    }
  };
  const join = async () => {
    if (!workspace || busy) return;
    setBusy(true);
    try {
      await joinWorkspaceThenShowWaiting(
        () => api.joinWorkspace({ code: inviteCode.trim().toUpperCase(), role: joinRole }),
        () => onNavigate("workspaceJoinWaiting"),
        onReload,
      );
    } catch (error) {
      showFailure("request", error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <SeugiTopBar
        backgroundColor={SeugiColor.White}
        leading={
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="뒤로" onPress={onBack}>
            <SeugiBackIcon />
          </TouchableOpacity>
        }
        title={<Text style={styles.title}>학교 가입</Text>}
        trailing={null}
      />
      {step === "role" ? (
        <WorkspaceRoleSelection
          value={joinRole}
          onChange={setJoinRole}
          onContinue={() => onNavigate("workspaceJoinCode")}
        />
      ) : null}
      {step === "confirm" && workspace ? (
        <WorkspaceJoinConfirmation
          workspace={workspace}
          busy={busy}
          onContinue={() => void join()}
        />
      ) : null}
      {step === "waiting" && workspace ? <WorkspaceApprovalScreen onDone={onDone} /> : null}
      {step === "code" ? (
        <WorkspaceJoinCodeScreen
          code={inviteCode}
          busy={busy}
          onChangeCode={(value) => setInviteCode(value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
          onContinue={() => void search()}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SeugiColor.White },
  back: { color: SeugiColor.Gray700, fontSize: 30, lineHeight: 34 },
  title: { color: SeugiColor.Gray800, fontSize: 18, fontWeight: "700" },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
});
