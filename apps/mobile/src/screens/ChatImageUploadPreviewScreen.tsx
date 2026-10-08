import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { ZoomableImage } from "../components/ZoomableImage";

export function ChatImageUploadPreviewScreen({
  visible,
  imageUri,
  busy,
  onClose,
  onSend,
  onRetry,
}: {
  visible: boolean;
  imageUri?: string;
  busy: boolean;
  onClose: () => void;
  onSend: () => void;
  onRetry: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.page}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="사진 미리보기 닫기" onPress={onClose} style={styles.headerIcon}>
            <Svg width={28} height={28} viewBox="0 0 28 28"><Path d="M13.054 22.992c.456.455 1.194.455 1.65 0 .456-.456.456-1.195 0-1.65l-6.31-6.311h13.773c.583 0 1.166-.448 1.166-1.031s-.583-1.031-1.166-1.031H8.394l6.31-6.311c.456-.455.456-1.194 0-1.65-.456-.455-1.194-.455-1.65 0l-7.96 7.961a1.46 1.46 0 0 0 0 2.062l7.96 7.961Z" fill="#FFFFFF" /></Svg>
          </TouchableOpacity>
          <View style={styles.spacer} />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="사진 전송" disabled={busy} onPress={onSend} style={styles.headerIcon}>
            <Svg width={28} height={28} viewBox="0 0 24 24" style={styles.sendIcon}><Path d="M19.975 20.772c.41.092.744-.335.555-.712L12.447 3.894a.5.5 0 0 0-.894 0L3.47 20.06c-.188.377.145.804.556.712l5.784-1.396a1 1 0 0 0 .775-.856l1.314-7.196.001-.016c.016-.604.185-.108.199.009l1.315 7.203a1 1 0 0 0 .776.856l5.784 1.396Z" fill="#FFFFFF" /></Svg>
          </TouchableOpacity>
        </View>
        {imageUri ? <ZoomableImage uri={imageUri} accessibilityLabel="전송할 사진 미리보기" /> : null}
        {Platform.OS === "android" ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="다른 사진 선택" onPress={onRetry} style={styles.retry}>
            <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M19 5v4.167h-4.167M19 9.167 16.5 6.91A7.5 7.5 0 1 0 18.814 14.167" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
          </TouchableOpacity>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#000000", paddingTop: 48, paddingBottom: 24 },
  header: { height: 48, flexDirection: "row", alignItems: "center", paddingHorizontal: 16 },
  spacer: { flex: 1 },
  headerIcon: { width: 36, height: 44, alignItems: "center", justifyContent: "center" },
  sendIcon: { transform: [{ rotate: "90deg" }] },
  retry: { alignSelf: "center", minWidth: 40, minHeight: 40, alignItems: "center", justifyContent: "center" },
});
