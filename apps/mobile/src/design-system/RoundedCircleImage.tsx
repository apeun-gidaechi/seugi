import { Image, Platform, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { SeugiColor } from "@seugi/design-tokens";
import {
  roundedCircleImageMetrics,
  type RoundedCircleImageSize,
} from "../utils/roundedCircleImage";
import { nativePlatform } from "../utils/platform";

export function SeugiRoundedCircleImage({
  uri,
  size = "medium",
}: {
  uri?: string;
  size?: RoundedCircleImageSize;
}) {
  const metrics = roundedCircleImageMetrics(nativePlatform(), size);
  const imageStyle = {
    width: metrics.dimension,
    height: metrics.dimension,
    borderRadius: metrics.radius,
    borderWidth: uri ? metrics.borderWidth : 0,
    borderColor: SeugiColor.Gray400,
  } as const;

  return uri ? (
    <Image source={{ uri }} resizeMode="cover" style={imageStyle} />
  ) : (
    <View style={[styles.fallback, imageStyle]}>
      <Svg
        width={metrics.iconDimension}
        height={metrics.iconDimension}
        viewBox="0 0 24 24"
        accessibilityElementsHidden
      >
        <Path
          fill={SeugiColor.Gray400}
          fillRule="evenodd"
          d="M3.75 3.75H19.7864L20.55 4.51364V20.55H4.51364L3.75 19.7864V3.75ZM5.27727 5.27727V13.0833L7.98471 10.3758L13.5384 15.9296L17.0095 12.4585L19.0227 14.4717V5.27727H5.27727ZM19.0227 16.6316L17.0095 14.6184L13.5384 18.0895L7.98471 12.5357L5.27727 15.2431V19.0227H19.0227V16.6316ZM14.9269 8.05413C14.1984 8.05413 13.6078 8.64467 13.6078 9.37314C13.6078 10.1016 14.1984 10.6922 14.9269 10.6922C15.6553 10.6922 16.2458 10.1016 16.2458 9.37314C16.2458 8.64467 15.6553 8.05413 14.9269 8.05413ZM12.0806 9.37314C12.0806 7.80118 13.3549 6.52686 14.9269 6.52686C16.4989 6.52686 17.7731 7.80118 17.7731 9.37314C17.7731 10.9451 16.4989 12.2194 14.9269 12.2194C13.3549 12.2194 12.0806 10.9451 12.0806 9.37314Z"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: SeugiColor.Gray100,
    alignItems: "center",
    justifyContent: "center",
  },
});
