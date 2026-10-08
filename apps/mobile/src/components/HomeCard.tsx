import type { ReactNode } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import { SeugiChevronRight } from "../design-system/NativeIndicators";
import { SeugiHomeCardIcon, type HomeCardIconName } from "../design-system/HomeCardIcon";

export function HomeCard({
  title,
  icon,
  children,
  onPress,
}: {
  title: string;
  icon: HomeCardIconName;
  children: ReactNode;
  onPress?: () => void;
}) {
  const heading = (
    <>
      <View style={[styles.homeCardIcon, icon === "cat" && Platform.OS === "ios" && styles.homeCardIconCat]}>
        <SeugiHomeCardIcon name={icon} size={icon === "cat" && Platform.OS === "ios" ? 16 : 24} />
      </View>
      <Text style={styles.homeCardTitle}>{title}</Text>
    </>
  );
  return (
    <View style={styles.homeCard}>
      {onPress ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`${title} 상세 보기`}
          onPress={onPress}
          style={[styles.homeCardHeader, styles.homeCardHeaderTouchable]}
        >
          {heading}
          <SeugiChevronRight />
        </TouchableOpacity>
      ) : (
        <View style={styles.homeCardHeader}>{heading}</View>
      )}
      <View style={styles.homeCardBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  homeCard: {
    backgroundColor: SeugiColor.White,
    borderRadius: 12,
    paddingTop: 12,
    paddingBottom: 16,
    marginBottom: 8,
    marginHorizontal: Platform.OS === "ios" ? 12 : 0,
  },
  homeCardHeader: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: Platform.OS === "ios" ? 4 : 16,
  },
  homeCardHeaderTouchable: { paddingRight: Platform.OS === "ios" ? 4 : 16 },
  homeCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: SeugiColor.Gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  homeCardIconCat: { width: 16, height: 16, borderRadius: 0, backgroundColor: "transparent" },
  homeCardTitle: { flex: 1, color: SeugiColor.Gray800, fontSize: 16, fontWeight: "600" },
  homeCardBody: { paddingHorizontal: Platform.OS === "ios" ? 0 : 12, paddingTop: 12 },
});
