export type AuthPlatform = "ios" | "android";

/** Native auth/join footers use a large full-width CTA on iOS and a compact one on Android. */
export function authPrimaryButtonSize(platform: AuthPlatform): "large" | "small" {
  return platform === "ios" ? "large" : "small";
}

export function authPrimaryButtonProps(platform: AuthPlatform) {
  return { size: authPrimaryButtonSize(platform), fullWidth: true as const };
}

/** Same geometry as auth footers; reused for modal sheets and onboarding actions. */
export const nativeFooterButtonProps = authPrimaryButtonProps;
