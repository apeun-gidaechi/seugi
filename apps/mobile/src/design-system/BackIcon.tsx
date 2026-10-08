import { Platform } from "react-native";
import Svg, { Path } from "react-native-svg";
import { SeugiColor } from "@seugi/design-tokens";

const iosPath =
  "M11.1893 19.7071C11.5799 20.0976 12.213 20.0976 12.6035 19.7071C12.9941 19.3166 12.9941 18.6834 12.6035 18.2929L7.19454 12.8839L19 12.8839C19.5 12.8839 20 12.5 20 12C20 11.4788 19.5 11.1161 19 11.1161L7.19454 11.1161L12.6035 5.70711C12.9941 5.31658 12.9941 4.68342 12.6035 4.29289C12.213 3.90237 11.5799 3.90237 11.1893 4.29289L4.36611 11.1161C3.87795 11.6043 3.87796 12.3957 4.36611 12.8839L11.1893 19.7071Z";
const androidPath =
  "M13.054 22.992C13.51 23.447 14.248 23.447 14.704 22.992C15.16 22.536 15.16 21.797 14.704 21.342L8.394 15.031L22.167 15.031C22.75 15.031 23.333 14.583 23.333 14C23.333 13.392 22.75 12.969 22.167 12.969L8.394 12.969L14.704 6.658C15.16 6.203 15.16 5.464 14.704 5.008C14.248 4.553 13.51 4.553 13.054 5.008L5.094 12.969C4.524 13.538 4.524 14.462 5.094 15.031L13.054 22.992Z";

export function SeugiBackIcon({
  size = Platform.OS === "android" ? 28 : 24,
  color = SeugiColor.Gray700,
}: {
  size?: number;
  color?: string;
}) {
  const android = Platform.OS === "android";
  return (
    <Svg
      width={size}
      height={size}
      viewBox={android ? "0 0 28 28" : "0 0 24 24"}
      accessibilityElementsHidden
    >
      <Path d={android ? androidPath : iosPath} fill={color} />
    </Svg>
  );
}
