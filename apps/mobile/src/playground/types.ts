import type { ComponentType } from "react";

export type PlaygroundSection = "screens" | "components" | "design-system";

export type PlaygroundDemoEntry = {
  id: string;
  title: string;
  subtitle?: string;
  group: string;
  Component: ComponentType;
};
