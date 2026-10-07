import { Platform } from "react-native";

// Android emulator reaches the development host through 10.0.2.2; override for devices.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? (Platform.OS === "android" ? "http://10.0.2.2:8080" : "http://localhost:8080");
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
export const GOOGLE_IOS_URL_SCHEME = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ?? "";
