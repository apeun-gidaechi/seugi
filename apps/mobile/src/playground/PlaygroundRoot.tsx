import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import { PlaygroundChrome } from "./PlaygroundChrome";
import { PlaygroundHomeScreen } from "./PlaygroundHomeScreen";
import { PlaygroundListScreen } from "./PlaygroundListScreen";
import { screenDemos } from "./screenDemos";
import { componentDemos } from "./componentDemos";
import { designSystemDemos } from "./designSystemDemos";
import type { PlaygroundSection } from "./types";
import { type PlaygroundStackParamList, playgroundStackScreenOptions } from "./playgroundStack";

const Stack = createNativeStackNavigator<PlaygroundStackParamList>();

function sectionEntries(section: PlaygroundSection) {
  if (section === "screens") return screenDemos;
  if (section === "design-system") return designSystemDemos;
  return componentDemos;
}

function sectionTitle(section: PlaygroundSection) {
  if (section === "screens") return "Screens";
  if (section === "design-system") return "Design system";
  return "Components";
}

function HomeScreen({ navigation }: NativeStackScreenProps<PlaygroundStackParamList, "Home">) {
  return (
    <PlaygroundChrome title="Playground">
      <PlaygroundHomeScreen
        onOpenDesignSystem={() => navigation.navigate("Section", { section: "design-system" })}
        onOpenScreens={() => navigation.navigate("Section", { section: "screens" })}
        onOpenComponents={() => navigation.navigate("Section", { section: "components" })}
      />
    </PlaygroundChrome>
  );
}

function SectionScreen({
  navigation,
  route,
}: NativeStackScreenProps<PlaygroundStackParamList, "Section">) {
  const { section } = route.params;
  return (
    <PlaygroundChrome title={sectionTitle(section)} onBack={() => navigation.goBack()}>
      <PlaygroundListScreen
        title={sectionTitle(section)}
        entries={sectionEntries(section)}
        onSelect={(id) => navigation.navigate("Demo", { section, id })}
      />
    </PlaygroundChrome>
  );
}

function DemoScreen({
  navigation,
  route,
}: NativeStackScreenProps<PlaygroundStackParamList, "Demo">) {
  const { section, id } = route.params;
  const entry = sectionEntries(section).find((item) => item.id === id);
  const title = entry?.title ?? "Demo";

  return (
    <PlaygroundChrome title={title} onBack={() => navigation.goBack()}>
      {entry ? (
        <View style={styles.demo}>
          <entry.Component />
        </View>
      ) : (
        <View style={styles.missing} />
      )}
    </PlaygroundChrome>
  );
}

export function PlaygroundRoot() {
  return (
    <Stack.Navigator screenOptions={playgroundStackScreenOptions}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Section" component={SectionScreen} />
      <Stack.Screen name="Demo" component={DemoScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  demo: { flex: 1, backgroundColor: SeugiColor.Primary050 },
  missing: { flex: 1, backgroundColor: SeugiColor.Red100 },
});
