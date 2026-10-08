import { Platform, Pressable, StyleSheet, Switch, View, type SwitchProps } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";

type SeugiToggleProps = Pick<
  SwitchProps,
  "value" | "onValueChange" | "disabled" | "accessibilityLabel" | "testID"
>;

/** Native Seugi switch: 51×31dp with a white thumb and primary/gray track. */
export function SeugiToggle({
  value,
  onValueChange,
  disabled,
  accessibilityLabel,
  testID,
}: SeugiToggleProps) {
  if (Platform.OS === "ios") {
    return (
      <Switch
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        style={styles.nativeSwitch}
        trackColor={{ false: SeugiColor.Gray200, true: SeugiColor.Primary500 }}
        thumbColor={SeugiColor.White}
        ios_backgroundColor={SeugiColor.Gray200}
      />
    );
  }

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      testID={testID}
      onPress={() => onValueChange?.(!value)}
      disabled={disabled}
      style={styles.androidSwitch}
    >
      <View
        style={[
          styles.track,
          { backgroundColor: value ? SeugiColor.Primary500 : SeugiColor.Gray200 },
        ]}
      >
        <View style={[styles.thumb, value && styles.thumbChecked]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  nativeSwitch: { width: 51, height: 31 },
  androidSwitch: { width: 51, height: 31, justifyContent: "center" },
  track: { width: 51, height: 31, borderRadius: 16, padding: 2, justifyContent: "center" },
  thumb: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: SeugiColor.White,
    shadowColor: SeugiColor.Black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  thumbChecked: { alignSelf: "flex-end" },
});
