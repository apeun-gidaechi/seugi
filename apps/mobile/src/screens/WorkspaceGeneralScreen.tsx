import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";

export function WorkspaceGeneralScreen() {
  const leaveWorkspace = () => {
    if (Platform.OS === "ios") {
      Alert.alert("정말 학교를 나가시겠습니까?", "나간 후에는\n다시 정보를 되돌릴 수 없습니다", [
        { text: "나가기", style: "destructive", onPress: () => undefined },
        { text: "취소", style: "cancel" },
      ]);
      return;
    }
    Alert.alert("탈퇴 실패 안내", "시연 모드에서는 탈퇴가 불가능합니다.");
  };

  return (
    <ScrollView style={styles.content}>
      <TouchableOpacity accessibilityRole="button" onPress={leaveWorkspace} style={styles.generalAction}>
        <Text style={styles.leaveWorkspace}>학교 나가기</Text>
        <Text style={styles.muted}>›</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 16 },
  generalAction: {
    minHeight: 56,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderColor: SeugiColor.Gray100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leaveWorkspace: { color: SeugiColor.Red500, fontSize: 15, fontWeight: "600" },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
});
