const isPlayground = process.env.EXPO_PUBLIC_APP_VARIANT === "playground";
const disabledNative = { platforms: { ios: null, android: null } };

module.exports = {
  dependencies: {
    ...(isPlayground
      ? {
          "expo-notifications": disabledNative,
          "expo-apple-authentication": disabledNative,
          "@react-native-google-signin/google-signin": disabledNative,
        }
      : {}),
    // Keep Expo's Android ReactPackage import aligned with the SDK 52 package.
    expo: {
      platforms: {
        android: {
          packageImportPath: "import expo.modules.ExpoModulesPackage;",
          packageInstance: "new ExpoModulesPackage()",
        },
      },
    },
  },
};
