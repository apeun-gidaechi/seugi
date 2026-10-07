module.exports = {
  dependencies: {
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
