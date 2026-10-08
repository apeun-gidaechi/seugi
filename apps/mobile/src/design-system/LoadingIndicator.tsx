import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Easing, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";

type SeugiLoadingIndicatorProps = {
  color?: string;
  pointColor?: string;
  size?: "small" | "large";
  style?: StyleProp<ViewStyle>;
};

/** iOS uses the native progress spinner; Android mirrors Seugi's three animated dots. */
export function SeugiLoadingIndicator({
  color = SeugiColor.Gray400,
  pointColor = SeugiColor.White,
  size = "small",
  style,
}: SeugiLoadingIndicatorProps) {
  if (Platform.OS === "ios") {
    return <ActivityIndicator accessibilityLabel="불러오는 중" size={size} color={SeugiColor.Primary500} style={style} />;
  }

  return (
    <View accessibilityRole="progressbar" accessibilityLabel="불러오는 중" style={[styles.dots, style]}>
      {[0, 1, 2].map((index) => <LoadingDot key={index} delay={150 * (index + 1)} pointColor={pointColor} color={color} />)}
    </View>
  );
}

function LoadingDot({ delay, pointColor, color }: { delay: number; pointColor: string; color: string }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(progress, { toValue: 1, duration: 500, easing: Easing.linear, useNativeDriver: false }),
      Animated.timing(progress, { toValue: 0, duration: 500, easing: Easing.linear, useNativeDriver: false }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [delay, progress]);

  const backgroundColor = progress.interpolate({ inputRange: [0, 1], outputRange: [pointColor, color] });
  return <Animated.View style={[styles.dot, { backgroundColor }]} />;
}

const styles = StyleSheet.create({
  dots: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
