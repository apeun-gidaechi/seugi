import { Image, StyleSheet, Text, View, type ImageStyle, type TextStyle, type ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import { SeugiColor } from "@seugi/design-tokens";

const personIcon = "M8 7C8 5.939 8.421 4.922 9.172 4.172C9.922 3.421 10.939 3 12 3C13.061 3 14.078 3.421 14.828 4.172C15.579 4.922 16 5.939 16 7C16 8.061 15.579 9.078 14.828 9.828C14.078 10.579 13.061 11 12 11C10.939 11 9.922 10.579 9.172 9.828C8.421 9.078 8 8.061 8 7ZM8 13C6.674 13 5.402 13.527 4.464 14.465C3.527 15.402 3 16.674 3 18C3 18.796 3.316 19.559 3.879 20.121C4.441 20.684 5.204 21 6 21H18C18.796 21 19.559 20.684 20.121 20.121C20.684 19.559 21 18.796 21 18C21 16.674 20.473 15.402 19.535 14.465C18.598 13.527 17.326 13 16 13H8Z";

type SeugiAvatarProps = {
  uri?: string | null;
  name?: string | null;
  fallbackText?: string;
  accessibilityLabel?: string;
  imageStyle: ImageStyle;
  fallbackStyle: ViewStyle;
  labelStyle?: TextStyle;
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

  const avatarSize = StyleSheet.flatten(imageStyle).width;
  const iconSize = typeof avatarSize === "number" ? avatarSize / 2 : 18;
  return <View accessibilityLabel={accessibilityLabel ?? name ?? "프로필"} style={[fallbackStyle, fallbackText === undefined && styles.nativeFallback]}>
    {fallbackText !== undefined
      ? <Text style={labelStyle}>{fallbackText}</Text>
      : <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24"><Path d={personIcon} fill={SeugiColor.Primary300} fillRule="evenodd" /></Svg>}
  </View>;
}

const styles = StyleSheet.create({ nativeFallback: { backgroundColor: SeugiColor.Primary200, alignItems: "center", justifyContent: "center" } });
