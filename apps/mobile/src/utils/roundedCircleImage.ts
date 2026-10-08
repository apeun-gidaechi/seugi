export type RoundedCircleImagePlatform = "android" | "ios";
export type RoundedCircleImageSize = "large" | "medium" | "small" | "extraSmall";

const baseSizes: Record<RoundedCircleImageSize, number> = {
  large: 180,
  medium: 128,
  small: 64,
  extraSmall: 48,
};

export function roundedCircleImageMetrics(
  platform: RoundedCircleImagePlatform,
  size: RoundedCircleImageSize,
) {
  const dimension = baseSizes[size];
  return {
    dimension,
    radius:
      platform === "ios" ? (dimension * 16) / 45 : size === "large" ? 64 : (dimension * 9) / 32,
    borderWidth: platform === "ios" ? 2 : 1,
    iconDimension: platform === "ios" ? (dimension * 5) / 9 : dimension / 2,
  };
}
