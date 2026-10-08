import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import { SeugiChevronRight } from "./NativeIndicators";

export function SeugiListItem({
  title,
  onPress,
  titleColor = SeugiColor.Gray800,
  trailing,
  showChevron = false,
  disabled = false,
  accessibilityLabel,
}: {
  title: string;
  onPress?: () => void;
  titleColor?: string;
  trailing?: ReactNode;
  showChevron?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const content = <>
    <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
    <View style={styles.trailing}>
      {trailing}
      {showChevron ? <SeugiChevronRight size={Platform.OS === "ios" ? 28 : 24} color={SeugiColor.Gray400} /> : null}
    </View>
  </>;

  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && !disabled ? styles.pressed : null]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 56, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 15, fontWeight: "600" },
  trailing: { flexDirection: "row", alignItems: "center", gap: 8 },
  pressed: { opacity: 0.72 },
});
