import type { ComponentType } from "react";

export type PlaygroundSection = "screens" | "components";

export type PlaygroundRoute =
  | { name: "home" }
  | { name: "design-system" }
  | { name: "section"; section: PlaygroundSection }
  | { name: "demo"; section: PlaygroundSection; id: string };

export type PlaygroundDemoEntry = {
  id: string;
  title: string;
  subtitle?: string;
  group: string;
  Component: ComponentType;
};
