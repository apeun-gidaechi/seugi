import { Image, Platform, StyleSheet, Text, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import { SeugiButton } from "../design-system/Button";
import { SeugiTooltip } from "../design-system/Tooltip";

export function WorkspaceApprovalScreen({ onDone }: { onDone: () => void }) {
  return <View style={styles.screen}>
    <View style={styles.spacer} />
    <View style={styles.approvalContent}>
      <Image source={require("../../assets/img_school.png")} style={styles.approvalImage} resizeMode="contain" />
      <Text style={styles.approvalTitle}>{Platform.OS === "ios" ? "학교 가입 신청 완료" : "대구소프트웨어마이스터고등학교"}</Text>
      <View style={styles.tooltip}><SeugiTooltip text="가입 수락을 대기중이에요" /></View>
    </View>
    <View style={styles.spacer} />
    <SeugiButton label="완료" onPress={onDone} size={Platform.OS === "ios" ? "large" : "small"} fullWidth style={styles.doneButton} />
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: "space-between", paddingHorizontal: Platform.OS === "ios" ? 20 : 16, paddingBottom: 16, backgroundColor: SeugiColor.White },
  spacer: { flex: 1 },
  approvalContent: { alignItems: "center", paddingHorizontal: Platform.OS === "ios" ? 28 : 50 },
  approvalImage: { width: 145, height: 145 },
  approvalTitle: { color: SeugiColor.Gray800, fontSize: 20, fontWeight: "700", textAlign: "center", marginTop: Platform.OS === "ios" ? 8 : 10 },
  tooltip: { alignSelf: "stretch", alignItems: "flex-end", marginTop: Platform.OS === "ios" ? 16 : 15 },
  doneButton: { marginBottom: 0 },
});
