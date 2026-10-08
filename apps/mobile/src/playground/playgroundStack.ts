import { SeugiColor } from "@seugi/design-tokens";
import type { PlaygroundSection } from "./types";

export type PlaygroundStackParamList = {
  Home: undefined;
  DesignSystem: undefined;
  Section: { section: PlaygroundSection };
  Demo: { section: PlaygroundSection; id: string };
};

export const playgroundStackScreenOptions = {
  headerShown: false,
  animation: "slide_from_right" as const,
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
  contentStyle: { backgroundColor: SeugiColor.Primary050 },
};
