import { Alert, Platform, ScrollView, StyleSheet } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import { SeugiListItem } from "../design-system/ListItem";

export function WorkspaceGeneralScreen() {
  const leaveWorkspace = () => {
    if (Platform.OS === "ios") {
      Alert.alert("정말 학교를 나가시겠습니까?", "나간 후에는\n다시 정보를 되돌릴 수 없습니다", [
        { text: "나가기", style: "destructive", onPress: () => undefined },
        { text: "취소", style: "cancel" },
      ]);
      return;
    }
    Alert.alert("탈퇴 실패 안내", "시연 모드에서는 탈퇴가 불가능합니다.", [{ text: "확인" }]);
  };

  return (
    <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
      <SeugiListItem
        title="학교 나가기"
        titleColor={SeugiColor.Red500}
        onPress={leaveWorkspace}
        showChevron
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  contentContainer: { paddingTop: 6 },
});
