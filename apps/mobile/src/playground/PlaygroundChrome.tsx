import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SeugiColor } from "@seugi/design-tokens";
import { SeugiBackIcon } from "../design-system/BackIcon";

export function PlaygroundChrome({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.bar}>
        {onBack ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="뒤로"
            onPress={onBack}
            style={styles.back}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <SeugiBackIcon />
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.backPlaceholder} />
      </View>
      <SafeAreaView style={styles.body} edges={["bottom"]}>
        {children}
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SeugiColor.White },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    minHeight: 44,
    backgroundColor: SeugiColor.White,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SeugiColor.Gray300,
  },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backPlaceholder: { width: 44 },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "600",
    color: SeugiColor.Gray800,
  },
  body: { flex: 1, backgroundColor: SeugiColor.Primary050 },
});
