import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
    <SafeAreaView style={styles.root}>
      <View style={styles.bar}>
        {onBack ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="뒤로"
            onPress={onBack}
            style={styles.back}
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
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SeugiColor.Primary050 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
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
    fontWeight: "700",
    color: SeugiColor.Gray800,
  },
  body: { flex: 1 },
});
