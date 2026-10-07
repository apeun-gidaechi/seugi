import { StyleSheet, TouchableOpacity } from "react-native";
import Svg, { Path } from "react-native-svg";
import { SeugiColor } from "@seugi/design-tokens";

const notification = "M12 3C11.073 3 10.277 3.661 10.108 4.573L10 5.152L9.208 5.221C7.337 5.384 5.833 6.832 5.6 8.696V14.81C5.6 14.862 5.58 14.912 5.544 14.95L4.604 15.919C4.217 16.32 4 16.855 4 17.412C4 18.301 4.721 19.022 5.609 19.022H9.562C9.583 19.022 9.6 19.038 9.6 19.059V19.1C9.6 20.426 10.675 21.5 12 21.5C13.325 21.5 14.4 20.426 14.4 19.1V19.059C14.4 19.038 14.417 19.022 14.438 19.022H19.054C19.576 19.022 20 18.598 20 18.076C20 17.093 19.618 16.149 18.934 15.443L18.456 14.95C18.42 14.912 18.4 14.862 18.4 14.81V8.696C18.167 6.832 16.663 5.384 14.792 5.221L14 5.152L13.892 4.573C13.723 3.661 12.927 3 12 3Z";
const mutedNotification = [
  "M18.934 15.443L18.456 14.95C18.42 14.912 18.4 14.862 18.4 14.81V9.343L8.721 19.022H9.562C9.583 19.022 9.6 19.038 9.6 19.059V19.1C9.6 20.426 10.675 21.5 12 21.5C13.325 21.5 14.4 20.426 14.4 19.1V19.059C14.4 19.038 14.417 19.022 14.438 19.022H19.054C19.576 19.022 20 18.598 20 18.076C20 17.093 19.618 16.149 18.934 15.443Z",
  "M10 5.152L9.208 5.221C7.337 5.384 5.833 6.832 5.6 8.696V13.657L14 5.152L13.892 4.573C13.723 3.661 12.927 3 12 3C11.073 3 10.277 3.661 10.108 4.573L10 5.152Z",
  "M19.207 5.707C19.598 5.317 19.598 4.683 19.207 4.293C19.139 4.225 19.064 4.169 18.984 4.125C18.604 3.914 18.115 3.97 17.793 4.293L16.38 5.706L14.707 7.379L4.293 17.793C4.223 17.863 4.165 17.941 4.12 18.024C3.915 18.403 3.972 18.887 4.293 19.207C4.683 19.598 5.317 19.598 5.707 19.207L5.892 19.022L17.829 7.085L19.207 5.707Z",
];

export function ChatNotificationToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={enabled ? "대화 알림 끄기" : "대화 알림 켜기"}
      accessibilityState={{ selected: enabled }}
      onPress={onToggle}
      style={styles.button}
    >
      <Svg width={28} height={28} viewBox="0 0 24 24">
        {(enabled ? [notification] : mutedNotification).map((path) => <Path key={path} d={path} fill={SeugiColor.Gray600} />)}
      </Svg>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({ button: { width: 36, height: 36, alignItems: "center", justifyContent: "center" } });
