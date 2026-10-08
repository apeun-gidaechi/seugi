import { Platform } from "react-native";

export function nativePlatform(): "ios" | "android" {
  return Platform.OS === "ios" ? "ios" : "android";
}
