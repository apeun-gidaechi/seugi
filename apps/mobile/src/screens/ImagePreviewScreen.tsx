import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  BackHandler,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { ZoomableImage } from "../components/ZoomableImage";

export function ImagePreviewScreen({
  visible,
  uri,
  onClose,
  onDownload,
  onSend,
  fileIsExist,
}: {
  visible: boolean;
  uri?: string;
  onClose: () => void;
  onDownload: () => void;
  onSend?: () => void;
  fileIsExist?: boolean;
}) {
  const { width } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(width)).current;
  useEffect(() => {
    if (Platform.OS !== "ios" || !visible) return;
    translateX.setValue(width);
    Animated.timing(translateX, { toValue: 0, duration: 240, useNativeDriver: true }).start();
  }, [translateX, visible, width]);
  useEffect(() => {
    if (Platform.OS !== "ios" || !visible) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose, visible]);
  const backSwipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Platform.OS === "ios" &&
          visible &&
          gesture.x0 <= 28 &&
          gesture.dx > 8 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          Platform.OS === "ios" &&
          visible &&
          gesture.x0 <= 28 &&
          gesture.dx > 8 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) =>
          translateX.setValue(Math.max(0, Math.min(width, gesture.dx))),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > width * 0.32 || gesture.vx > 0.5) {
            Animated.timing(translateX, {
              toValue: width,
              duration: 180,
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (finished) onClose();
            });
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 0,
            }).start();
          }
        },
        onPanResponderTerminate: () =>
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start(),
      }),
    [onClose, translateX, visible, width],
  );

  const content = (
    <View style={styles.page}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="이미지 미리보기 닫기"
          onPress={onClose}
          style={styles.backButton}
        >
          <Svg width={28} height={28} viewBox="0 0 28 28">
            <Path
              d="M13.054 22.992c.456.455 1.194.455 1.65 0 .456-.456.456-1.195 0-1.65l-6.31-6.311h13.773c.583 0 1.166-.448 1.166-1.031s-.583-1.031-1.166-1.031H8.394l6.31-6.311c.456-.455.456-1.194 0-1.65-.456-.455-1.194-.455-1.65 0l-7.96 7.961a1.46 1.46 0 0 0 0 2.062l7.96 7.961Z"
              fill="#FFFFFF"
            />
          </Svg>
        </TouchableOpacity>
      </View>
      {uri ? <ZoomableImage uri={uri} accessibilityLabel="채팅 이미지 미리보기" /> : null}
      {Platform.OS === "android" && fileIsExist === false ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="이미지 다운로드"
          onPress={onDownload}
          style={styles.download}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path
              d="M19.707 10.811C20.098 10.42 20.098 9.787 19.707 9.396C19.317 9.006 18.683 9.006 18.293 9.396L12.884 14.806L12.884 3C12.884 2.5 12.5 2 12 2C11.479 2 11.116 2.5 11.116 3V14.806L5.707 9.396C5.317 9.006 4.683 9.006 4.293 9.396C3.902 9.787 3.902 10.42 4.293 10.811L11.116 17.634C11.604 18.122 12.396 18.122 12.884 17.634L19.707 10.811Z"
              fill="#FFFFFF"
            />
            <Path
              d="M4.957 21C4.957 20.448 5.424 20 6 20H18C18.576 20 19.044 20.448 19.044 21C19.044 21.552 18.576 22 18 22H6C5.424 22 4.957 21.552 4.957 21Z"
              fill="#FFFFFF"
              fillRule="evenodd"
            />
          </Svg>
        </TouchableOpacity>
      ) : null}
      {Platform.OS === "ios" && onSend ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="사진 전송"
          onPress={onSend}
          style={styles.download}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M19.9745 20.7721C20.3855 20.8635 20.7185 20.437 20.5302 20.0604L12.4472 3.89444C12.263 3.52591 11.7371 3.52591 11.5528 3.89443L3.46979 20.0604C3.28151 20.437 3.61448 20.8635 4.02547 20.7721L9.80963 19.3756C10.2234 19.2837 10.5342 18.9409 10.5854 18.5202L11.8993 11.324C11.9003 11.3188 11.9008 11.3132 11.9009 11.3079C11.9165 10.7035 12.0851 11.1995 12.0993 11.3162L13.4146 18.5202C13.4658 18.9409 13.7766 19.2837 14.1904 19.3756L19.9745 20.7721Z"
              fill="#FFFFFF"
            />
          </Svg>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  if (Platform.OS === "ios") {
    if (!visible) return null;
    return (
      <Animated.View
        {...backSwipe.panHandlers}
        style={[styles.iosRoute, { transform: [{ translateX }] }]}
      >
        {content}
      </Animated.View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#000000", padding: 16 },
  iosRoute: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
    backgroundColor: "#000000",
  },
  header: { height: 48, flexDirection: "row", alignItems: "center", paddingHorizontal: 4 },
  backButton: { width: 36, height: 44, alignItems: "flex-start", justifyContent: "center" },
  download: {
    alignSelf: "center",
    minWidth: 40,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
