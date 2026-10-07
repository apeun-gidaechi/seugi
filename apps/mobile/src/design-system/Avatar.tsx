import { Image, Text, View, type ImageStyle, type TextStyle, type ViewStyle } from "react-native";

type SeugiAvatarProps = {
  uri?: string | null;
  name?: string | null;
  fallbackText?: string;
  accessibilityLabel?: string;
  imageStyle: ImageStyle;
  fallbackStyle: ViewStyle;
  labelStyle: TextStyle;
};

/** Shared image/fallback rendering; callers provide the exact native screen geometry. */
export function SeugiAvatar({
  uri,
  name,
  fallbackText,
  accessibilityLabel,
  imageStyle,
  fallbackStyle,
  labelStyle,
}: SeugiAvatarProps) {
  if (uri) {
    return <Image accessibilityLabel={accessibilityLabel ?? name ?? "프로필 사진"} source={{ uri }} style={imageStyle} />;
  }

  return (
    <View accessibilityLabel={accessibilityLabel ?? name ?? "프로필"} style={fallbackStyle}>
      <Text style={labelStyle}>{fallbackText ?? name?.slice(0, 1) ?? "?"}</Text>
    </View>
  );
}
