import { Platform, StyleSheet, Text, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import { formatBadgeCount } from "../utils/badge";

type SeugiBadgeProps = { count?: number | null };

/** Native Seugi badge: a 12dp status dot or the platform-specific count pill. */
export function SeugiBadge({ count }: SeugiBadgeProps) {
  if (count == null) return <View accessible={false} style={styles.dot} />;

  return (
    <View accessible accessibilityLabel={`읽지 않은 메시지 ${count}개`} style={styles.countBadge}>
      <Text numberOfLines={1} style={styles.countText}>{formatBadgeCount(count, Platform.OS === "ios" ? "ios" : "android")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Platform.OS === "ios" ? SeugiColor.Orange500 : SeugiColor.Yellow100,
  },
  countBadge: {
    minHeight: 20,
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === "ios" ? 0 : 2,
    justifyContent: "center",
    backgroundColor: Platform.OS === "ios" ? SeugiColor.Orange500 : SeugiColor.Yellow100,
  },
  countText: {
    color: SeugiColor.White,
    fontSize: 12,
    fontWeight: Platform.OS === "ios" ? "400" : "600",
    includeFontPadding: false,
    textAlign: "center",
  },
});
