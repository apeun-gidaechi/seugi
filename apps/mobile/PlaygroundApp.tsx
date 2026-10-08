import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { enableScreens } from "react-native-screens";
import { SeugiColor } from "@seugi/design-tokens";
import { PlaygroundRoot } from "./src/playground/PlaygroundRoot";

enableScreens(true);

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: SeugiColor.Primary050,
  },
};

export default function PlaygroundApp() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
        <PlaygroundRoot />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
