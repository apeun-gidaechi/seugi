import { Platform, StyleSheet, Text, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { WorkspaceSearchSummary } from "@seugi/contracts";
import { authPrimaryButtonProps } from "../utils/authButton";
import { Button } from "./ui";
import { SeugiRoundedCircleImage } from "../design-system/RoundedCircleImage";

export function WorkspaceJoinConfirmation({
  workspace,
  busy,
  onContinue,
}: {
  workspace: WorkspaceSearchSummary;
  busy: boolean;
  onContinue: () => void;
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.spacer} />
      <View style={styles.summary}>
        <SeugiRoundedCircleImage uri={workspace.workspaceImageUrl} />
        <Text style={styles.name}>{workspace.workspaceName}</Text>
        <Text style={styles.counts}>학생 {workspace.studentCount}명 선생님 {workspace.teacherCount}명</Text>
      </View>
      <View style={styles.spacer} />
      <Button label="계속하기" onPress={onContinue} disabled={busy} loading={busy} {...authPrimaryButtonProps(Platform.OS === "ios" ? "ios" : "android")} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: SeugiColor.White },
  spacer: { flex: 1 },
  summary: { alignItems: "center", justifyContent: "center" },
  name: { color: SeugiColor.Gray800, fontSize: 20, fontWeight: "700", textAlign: "center", marginTop: 16 },
  counts: { color: SeugiColor.Gray600, fontSize: 15, marginTop: 4 },
});
