import { StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { SeugiColor } from "@seugi/design-tokens";

/** Side tooltip used by Android and iOS workspace approval screens. */
export function SeugiTooltip({ text }: { text: string }) {
  return (
    <View style={styles.root}>
      <Svg width={19} height={14} viewBox="0 0 19 14" style={styles.arrow}>
        <Path
          d="M1.505 2.715C1.716 1.13 3.611.421 4.81 1.48L19 14H0L1.505 2.715Z"
          fill={SeugiColor.Gray700}
        />
      </Svg>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: "flex-start", alignItems: "flex-start" },
  arrow: { marginLeft: 16, marginBottom: -1 },
  text: {
    color: SeugiColor.White,
    backgroundColor: SeugiColor.Gray700,
    overflow: "hidden",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    lineHeight: 20,
  },
});
