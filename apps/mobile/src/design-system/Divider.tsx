import { View, type StyleProp, type ViewStyle } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";

export type SeugiDividerProps = {
  direction?: "horizontal" | "vertical";
  thickness?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/** Shared native divider primitive; callers may provide the original screen color/insets. */
export function SeugiDivider({
  direction = "horizontal",
  thickness = 1,
  color = SeugiColor.Gray200,
  style,
}: SeugiDividerProps) {
  return <View accessible={false} style={[
    direction === "horizontal"
      ? { height: thickness }
      : { width: thickness, height: "100%" },
    { backgroundColor: color },
    style,
  ]} />;
}
