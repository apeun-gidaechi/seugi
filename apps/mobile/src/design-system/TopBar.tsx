import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";

/** Shared Seugi top-bar frame; the host supplies platform-specific slot content. */
export function SeugiTopBar({
  leading,
  title,
  trailing,
  backgroundColor = SeugiColor.White,
  shadow = false,
}: {
  leading: ReactNode;
  title: ReactNode;
  trailing: ReactNode;
  backgroundColor?: string;
  shadow?: boolean;
}) {
  return (
    <View style={[styles.bar, { backgroundColor }, shadow && styles.shadow]}>
      <View style={styles.leading}>{leading}</View>
      <View style={styles.title}>{title}</View>
      <View style={styles.trailing}>{trailing}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { minHeight: 54, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" },
  leading: { width: 36, justifyContent: "center", alignItems: "flex-start" },
  title: { flex: 1, minWidth: 0, justifyContent: "center" },
  trailing: { width: 64, justifyContent: "center", alignItems: "flex-end" },
  shadow: { zIndex: 1, shadowColor: SeugiColor.Black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
});
