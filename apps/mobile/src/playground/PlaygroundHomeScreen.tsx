import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import { componentDemos } from "./componentDemos";
import { screenDemos } from "./screenDemos";

const designSystemComponentCount = 25;

export function PlaygroundHomeScreen({
  onOpenDesignSystem,
  onOpenScreens,
  onOpenComponents,
}: {
  onOpenDesignSystem: () => void;
  onOpenScreens: () => void;
  onOpenComponents: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Seugi Playground</Text>
      <Text style={styles.subheading}>
        Browse native design tokens, screens, and shared components without signing in.
      </Text>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>Demo API — sample data, no backend</Text>
      </View>
      <CatalogCard
        title="Design system"
        description={`${designSystemComponentCount} primitives · buttons, fields, icons`}
        onPress={onOpenDesignSystem}
      />
      <CatalogCard
        title="Screens"
        description={`${screenDemos.length} screen demos · API may show empty states`}
        onPress={onOpenScreens}
      />
      <CatalogCard
        title="Components"
        description={`${componentDemos.length} shared components`}
        onPress={onOpenComponents}
      />
    </ScrollView>
  );
}

function CatalogCard({
  title,
  description,
  onPress,
}: {
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardBody}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 12 },
  heading: { fontSize: 28, fontWeight: "800", color: SeugiColor.Gray800 },
  subheading: { fontSize: 15, color: SeugiColor.Gray600, marginBottom: 8, lineHeight: 22 },
  banner: {
    backgroundColor: SeugiColor.Primary100,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  bannerText: { color: SeugiColor.Primary700, fontSize: 13, fontWeight: "600" },
  card: {
    backgroundColor: SeugiColor.White,
    borderRadius: 14,
    padding: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SeugiColor.Gray300,
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: SeugiColor.Gray800, marginBottom: 6 },
  cardBody: { fontSize: 14, color: SeugiColor.Gray600, lineHeight: 20 },
});
