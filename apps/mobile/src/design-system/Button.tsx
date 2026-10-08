import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SeugiColor } from "@seugi/design-tokens";

export type SeugiButtonVariant = "primary" | "black" | "red" | "transparent" | "shadow" | "gray";
export type SeugiButtonSize = "large" | "medium" | "small";

const colors: Record<
  SeugiButtonVariant,
  { background: string; foreground: string; disabledBackground: string; disabledForeground: string }
> = {
  primary: {
    background: SeugiColor.Primary500,
    foreground: SeugiColor.White,
    disabledBackground: SeugiColor.Primary200,
    disabledForeground: SeugiColor.White,
  },
  black: {
    background: SeugiColor.Black,
    foreground: SeugiColor.White,
    disabledBackground: SeugiColor.Gray600,
    disabledForeground: SeugiColor.White,
  },
  red: {
    background: SeugiColor.Red200,
    foreground: SeugiColor.Red500,
    disabledBackground: SeugiColor.Red100,
    disabledForeground: SeugiColor.Red300,
  },
  transparent: {
    background: "transparent",
    foreground: SeugiColor.Black,
    disabledBackground: "transparent",
    disabledForeground: SeugiColor.Gray500,
  },
  shadow: {
    background: SeugiColor.White,
    foreground: SeugiColor.Black,
    disabledBackground: SeugiColor.White,
    disabledForeground: SeugiColor.Gray500,
  },
  gray: {
    background: SeugiColor.Gray100,
    foreground: SeugiColor.Gray600,
    disabledBackground: SeugiColor.Gray100,
    disabledForeground: SeugiColor.Gray500,
  },
};

/** Seugi button primitive based on the Android and iOS button variants. */
export function SeugiButton({
  label,
  onPress,
  variant = "primary",
  size = "small",
  disabled = false,
  loading = false,
  fullWidth = false,
  accessibilityLabel,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: SeugiButtonVariant;
  size?: SeugiButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = colors[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        style,
        size === "large" ? styles.large : size === "medium" ? styles.medium : styles.small,
        fullWidth && styles.fullWidth,
        variant === "shadow" && styles.shadow,
        { backgroundColor: inactive ? palette.disabledBackground : palette.background },
        inactive && styles.disabled,
        pressed && !inactive && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={inactive ? palette.disabledForeground : palette.foreground} />
      ) : (
        <Text
          style={[
            styles.label,
            size === "large" ? styles.largeLabel : styles.smallLabel,
            { color: inactive ? palette.disabledForeground : palette.foreground },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    overflow: "hidden",
  },
  large: { minHeight: 54, paddingHorizontal: 16, paddingVertical: 12 },
  medium: { minHeight: 45, paddingHorizontal: 12, paddingVertical: 10 },
  small: { minHeight: 36, paddingHorizontal: 12, paddingVertical: 8 },
  fullWidth: { alignSelf: "stretch" },
  shadow: {
    shadowColor: SeugiColor.Black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  disabled: { opacity: 1 },
  pressed: { opacity: 0.64, transform: [{ scale: 0.96 }] },
  label: { fontFamily: "Pretendard", fontWeight: "600", textAlign: "center" },
  largeLabel: { fontSize: 16, lineHeight: 21 },
  smallLabel: { fontSize: 14, lineHeight: 18, fontWeight: "400" },
});
