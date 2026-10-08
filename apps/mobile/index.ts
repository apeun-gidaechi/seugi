import { registerRootComponent } from "expo";
import { Platform } from "react-native";
import { isPlaygroundApp } from "./src/appVariant";

const playground = isPlaygroundApp();

if (playground) {
  registerRootComponent(require("./PlaygroundApp").default);
} else {
  registerRootComponent(require("./App").default);
  if (Platform.OS === "android") {
    const { registerSeugiWidgetTask } = require("./src/widgets/android");
    registerSeugiWidgetTask();
  }
}
