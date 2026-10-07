import { Image, StyleSheet, Text, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { WorkspaceSearchSummary } from "@seugi/contracts";
import { Button } from "./ui";

export function WorkspaceJoinConfirmation({
  workspace,
  busy,
  error,
  onContinue,
}: {
  workspace: WorkspaceSearchSummary;
  busy: boolean;
  error: string;
  onContinue: () => void;
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.spacer} />
      <View style={styles.summary}>
        {workspace.workspaceImageUrl ? (
          <Image source={{ uri: workspace.workspaceImageUrl }} style={styles.image} />
        ) : (
          <View style={styles.imageFallback}><Text style={styles.homeIcon}>⌂</Text></View>
        )}
        <Text style={styles.name}>{workspace.workspaceName}</Text>
        <Text style={styles.counts}>학생 {workspace.studentCount}명 선생님 {workspace.teacherCount}명</Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </View>
      <View style={styles.spacer} />
      <Button label={busy ? "신청 중…" : "계속하기"} onPress={onContinue} disabled={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: SeugiColor.White },
  spacer: { flex: 1 },
  summary: { alignItems: "center", justifyContent: "center" },
  image: { width: 104, height: 104, borderRadius: 52 },
  imageFallback: { width: 104, height: 104, borderRadius: 52, backgroundColor: SeugiColor.Gray100, alignItems: "center", justifyContent: "center" },
  homeIcon: { color: SeugiColor.Primary500, fontSize: 58, lineHeight: 68 },
  name: { color: SeugiColor.Gray800, fontSize: 20, fontWeight: "700", textAlign: "center", marginTop: 16 },
  counts: { color: SeugiColor.Gray600, fontSize: 15, marginTop: 4 },
  error: { color: SeugiColor.Red500, textAlign: "center", marginTop: 12 },
});
