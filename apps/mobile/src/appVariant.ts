import * as Application from "expo-application";

const PLAYGROUND_BUNDLE_IDS = new Set(["com.seugi.playground"]);

/** True when the installed binary is the playground app (not Metro env). */
export function isPlaygroundApp(): boolean {
  const bundleId = Application.applicationId;
  if (bundleId && PLAYGROUND_BUNDLE_IDS.has(bundleId)) return true;
  return process.env.EXPO_PUBLIC_APP_VARIANT === "playground";
}
