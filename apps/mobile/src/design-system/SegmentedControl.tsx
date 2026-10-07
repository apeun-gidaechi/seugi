import { Pressable, StyleSheet, Text, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";

export function SeugiSegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" style={styles.row}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.option, selected ? styles.selected : styles.unselected]}
          >
            <Text style={selected ? styles.selectedLabel : styles.label}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  option: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: 8, borderRadius: 12, borderWidth: 1 },
  selected: { backgroundColor: SeugiColor.Primary100, borderColor: SeugiColor.Primary500 },
  unselected: { backgroundColor: SeugiColor.Gray100, borderColor: SeugiColor.Gray100 },
  selectedLabel: { color: SeugiColor.Primary500, fontFamily: "Pretendard", fontSize: 14, fontWeight: "600" },
  label: { color: SeugiColor.Gray600, fontFamily: "Pretendard", fontSize: 14 },
});
