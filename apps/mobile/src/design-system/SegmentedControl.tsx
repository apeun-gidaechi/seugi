import { Pressable, StyleSheet, Text, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";

export function SeugiSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  variant = "default",
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  variant?: "default" | "nativeTabs";
}) {
  return (
    <View accessibilityRole="radiogroup" style={[styles.row, variant === "nativeTabs" && styles.nativeRow]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.option,
              variant === "nativeTabs" && styles.nativeOption,
              selected ? (variant === "nativeTabs" ? styles.nativeSelected : styles.selected) : (variant === "nativeTabs" ? styles.nativeUnselected : styles.unselected),
            ]}
          >
            <Text style={selected ? (variant === "nativeTabs" ? styles.nativeSelectedLabel : styles.selectedLabel) : (variant === "nativeTabs" ? styles.nativeLabel : styles.label)}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  nativeRow: { height: 48, padding: 4, gap: 4, borderRadius: 12, backgroundColor: SeugiColor.Gray100 },
  option: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 8, borderRadius: 12, borderWidth: 1 },
  nativeOption: { minHeight: 40, borderWidth: 0, borderRadius: 8, paddingHorizontal: 4 },
  selected: { backgroundColor: SeugiColor.Primary100, borderColor: SeugiColor.Primary500 },
  unselected: { backgroundColor: SeugiColor.Gray100, borderColor: SeugiColor.Gray100 },
  nativeSelected: { backgroundColor: SeugiColor.White, shadowColor: "#000000", shadowOpacity: 0.08, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  nativeUnselected: { backgroundColor: "transparent" },
  selectedLabel: { color: SeugiColor.Primary500, fontFamily: "Pretendard", fontSize: 14, fontWeight: "600" },
  label: { color: SeugiColor.Gray600, fontFamily: "Pretendard", fontSize: 14 },
  nativeSelectedLabel: { color: SeugiColor.Gray800, fontFamily: "Pretendard", fontSize: 16, fontWeight: "600" },
  nativeLabel: { color: SeugiColor.Gray600, fontFamily: "Pretendard", fontSize: 14 },
});
