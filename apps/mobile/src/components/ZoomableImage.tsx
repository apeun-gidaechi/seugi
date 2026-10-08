import { useMemo, useRef } from "react";
import { Animated, PanResponder, StyleSheet } from "react-native";

type TouchPoint = { pageX: number; pageY: number };

function touchDistance(touches: TouchPoint[]) {
  const [first, second] = touches;
  if (!first || !second) return 0;
  return Math.hypot(second.pageX - first.pageX, second.pageY - first.pageY);
}

export function ZoomableImage({
  uri,
  accessibilityLabel = "이미지",
}: {
  uri: string;
  accessibilityLabel?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const currentScale = useRef(1);
  const currentX = useRef(0);
  const currentY = useRef(0);
  const startDistance = useRef(0);
  const startScale = useRef(1);
  const startX = useRef(0);
  const startY = useRef(0);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (event) =>
          event.nativeEvent.touches.length >= 2 || currentScale.current > 1,
        onMoveShouldSetPanResponder: (event) =>
          event.nativeEvent.touches.length >= 2 || currentScale.current > 1,
        onStartShouldSetPanResponderCapture: (event) => event.nativeEvent.touches.length >= 2,
        onMoveShouldSetPanResponderCapture: (event) =>
          event.nativeEvent.touches.length >= 2 || currentScale.current > 1,
        onPanResponderGrant: (event) => {
          const touches = event.nativeEvent.touches as TouchPoint[];
          startDistance.current = touchDistance(touches);
          startScale.current = currentScale.current;
          startX.current = currentX.current;
          startY.current = currentY.current;
        },
        onPanResponderMove: (event, gesture) => {
          const touches = event.nativeEvent.touches as TouchPoint[];
          if (touches.length >= 2) {
            const distance = touchDistance(touches);
            if (!startDistance.current) {
              startDistance.current = distance;
              startScale.current = currentScale.current;
            }
            const nextScale = Math.max(
              1,
              Math.min(3, (startScale.current * distance) / startDistance.current),
            );
            currentScale.current = nextScale;
            scale.setValue(nextScale);
            return;
          }
          if (currentScale.current > 1) {
            currentX.current = startX.current + gesture.dx;
            currentY.current = startY.current + gesture.dy;
            translateX.setValue(currentX.current);
            translateY.setValue(currentY.current);
          }
        },
        onPanResponderRelease: () => {
          startDistance.current = 0;
          if (currentScale.current <= 1) {
            currentScale.current = 1;
            currentX.current = 0;
            currentY.current = 0;
            scale.setValue(1);
            translateX.setValue(0);
            translateY.setValue(0);
          }
        },
        onPanResponderTerminate: () => {
          startDistance.current = 0;
        },
      }),
    [scale, translateX, translateY],
  );

  return (
    <Animated.View style={styles.container} {...responder.panHandlers}>
      <Animated.Image
        accessibilityLabel={accessibilityLabel}
        source={{ uri }}
        resizeMode="contain"
        style={[styles.image, { transform: [{ translateX }, { translateY }, { scale }] }]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
});
