import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";

const shimmerBase = "#E4E4E4";

export function SeugiShimmer({ style, accessibilityLabel }: { style?: StyleProp<ViewStyle>; accessibilityLabel?: string }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(progress, { toValue: 0, duration: 800, useNativeDriver: false }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [progress]);

  const opacity = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.7, 0] });
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-Math.max(size.height, 24), size.width] });
  const measure = (event: LayoutChangeEvent) => setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height });

  return <View accessibilityLabel={accessibilityLabel} onLayout={measure} style={[styles.base, style]}>
    <Animated.View pointerEvents="none" style={[styles.sheen, {
      width: Math.max(size.height, 24),
      height: Math.max(size.height * 2, 48),
      top: -size.height / 2,
      opacity,
      transform: [{ translateX }, { rotate: "25deg" }],
    }]} />
  </View>;
}

const styles = StyleSheet.create({
  base: { overflow: "hidden", backgroundColor: shimmerBase },
  sheen: { position: "absolute", backgroundColor: "#FFFFFF" },
});
