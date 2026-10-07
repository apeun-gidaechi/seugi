import { registerRootComponent } from "expo";
import { Platform } from "react-native";
import App from "./App";

registerRootComponent(App);

if (Platform.OS === "android") {
  const { registerSeugiWidgetTask } = require("./src/widgets/android");
  registerSeugiWidgetTask();
}
