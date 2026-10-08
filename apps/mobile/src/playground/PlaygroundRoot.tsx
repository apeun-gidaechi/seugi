import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import { PlaygroundChrome } from "./PlaygroundChrome";
import { PlaygroundHomeScreen } from "./PlaygroundHomeScreen";
import { PlaygroundListScreen } from "./PlaygroundListScreen";
import { DesignSystemCatalogScreen } from "./DesignSystemCatalogScreen";
import { screenDemos } from "./screenDemos";
import { componentDemos } from "./componentDemos";
import type { PlaygroundRoute, PlaygroundSection } from "./types";

function sectionEntries(section: PlaygroundSection) {
  return section === "screens" ? screenDemos : componentDemos;
}

function sectionTitle(section: PlaygroundSection) {
  return section === "screens" ? "Screens" : "Components";
}

export function PlaygroundRoot() {
  const [route, setRoute] = useState<PlaygroundRoute>({ name: "home" });

  const chromeTitle = useMemo(() => {
    if (route.name === "home") return "Playground";
    if (route.name === "design-system") return "Design system";
    if (route.name === "section") return sectionTitle(route.section);
    if (route.name === "demo") {
      const entry = sectionEntries(route.section).find((item) => item.id === route.id);
      return entry?.title ?? "Demo";
    }
    return "Playground";
  }, [route]);

  const onBack = () => {
    if (route.name === "demo") {
      setRoute({ name: "section", section: route.section });
      return;
    }
    if (route.name === "section" || route.name === "design-system") {
      setRoute({ name: "home" });
    }
  };

  const showChromeBack = route.name !== "home";

  if (route.name === "design-system") {
    return (
      <DesignSystemCatalogScreen onBack={() => setRoute({ name: "home" })} />
    );
  }

  return (
    <PlaygroundChrome title={chromeTitle} onBack={showChromeBack ? onBack : undefined}>
      {route.name === "home" ? (
        <PlaygroundHomeScreen
          onOpenDesignSystem={() => setRoute({ name: "design-system" })}
          onOpenScreens={() => setRoute({ name: "section", section: "screens" })}
          onOpenComponents={() => setRoute({ name: "section", section: "components" })}
        />
      ) : null}
      {route.name === "section" ? (
        <PlaygroundListScreen
          title={sectionTitle(route.section)}
          entries={sectionEntries(route.section)}
          onSelect={(id) => setRoute({ name: "demo", section: route.section, id })}
          onBack={() => setRoute({ name: "home" })}
        />
      ) : null}
      {route.name === "demo" ? (
        <DemoHost section={route.section} id={route.id} />
      ) : null}
    </PlaygroundChrome>
  );
}

function DemoHost({ section, id }: { section: PlaygroundSection; id: string }) {
  const entry = sectionEntries(section).find((item) => item.id === id);
  if (!entry) {
    return <View style={styles.missing} />;
  }
  return (
    <View style={styles.demo}>
      <entry.Component />
    </View>
  );
}

const styles = StyleSheet.create({
  demo: { flex: 1, backgroundColor: SeugiColor.Primary050 },
  missing: { flex: 1, backgroundColor: SeugiColor.Red100 },
});
