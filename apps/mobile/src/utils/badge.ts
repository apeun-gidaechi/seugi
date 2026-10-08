export type BadgePlatform = "android" | "ios";

/** Preserves the source clients' distinct 300-count cutoff. */
export function formatBadgeCount(count: number, platform: BadgePlatform) {
  return (platform === "ios" ? count >= 300 : count > 300) ? "300+" : String(count);
}
