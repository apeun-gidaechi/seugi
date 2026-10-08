import type { ExpoConfig, ConfigContext } from "expo/config";
import {
  withAndroidManifest,
  withEntitlementsPlist,
  withInfoPlist,
  withPodfile,
} from "expo/config-plugins";

/** Playground builds use a wildcard dev profile; drop capabilities that need explicit provisioning. */
const withPlaygroundEntitlements = (config: ExpoConfig) =>
  withEntitlementsPlist(config, (config) => {
    delete config.modResults["aps-environment"];
    delete config.modResults["com.apple.developer.applesignin"];
    delete config.modResults["com.apple.security.application-groups"];
    return config;
  });

/** app.json still sets scheme `seugi`; playground Metro uses `seugi-playground`. */
const withPlaygroundUrlScheme = (config: ExpoConfig) =>
  withInfoPlist(config, (config) => {
    const urlTypes = config.modResults.CFBundleURLTypes;
    if (!Array.isArray(urlTypes)) return config;
    for (const entry of urlTypes) {
      const schemes = entry.CFBundleURLSchemes;
      if (!Array.isArray(schemes)) continue;
      const idx = schemes.indexOf("seugi");
      if (idx !== -1) schemes[idx] = "seugi-playground";
    }
    return config;
  });

const withAndroidBackupDisabled = (config: ExpoConfig) =>
  withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (application) application.$["android:allowBackup"] = "false";
    return config;
  });

const withWidgetPodfileFix = (config: ExpoConfig) =>
  withPodfile(config, (config) => {
    config.modResults.contents = config.modResults.contents.replace(
      /\ntarget 'SeugiWidgetExtension' do[\s\S]*?\nend\s*$/,
      "\n",
    );
    return config;
  });

const androidWidgetConfig = {
  widgets: [
    {
      name: "SeugiMealWidget",
      label: "스기 오늘의 급식",
      description: "현재 시간대의 오늘 급식 메뉴를 표시합니다.",
      minWidth: "128dp" as const,
      minHeight: "128dp" as const,
      resizeMode: "horizontal|vertical" as const,
      updatePeriodMillis: 1_800_000,
    },
    {
      name: "SeugiTimetableWidget",
      label: "스기 오늘의 시간표",
      description: "오늘의 시간표를 표시합니다.",
      minWidth: "128dp" as const,
      minHeight: "128dp" as const,
      resizeMode: "horizontal|vertical" as const,
      updatePeriodMillis: 1_800_000,
    },
  ],
};

const createIosWidgetConfig = (iosTeamId: string) => ({
  ios: {
    src: "./src/widgets/ios",
    deploymentTarget: "16.2",
    useLiveActivities: false,
    frequentUpdates: false,
    // The widget config plugin emits invalid `DEVELOPMENT_TEAM = ;` when this is empty.
    devTeamId: process.env.EXPO_IOS_TEAM_ID ?? iosTeamId,
    moduleDependencies: [],
    mode: "development" as const,
    widgetExtPlugins: [],
    xcode: { appGroupId: "group.com.seugi.app.expowidgets", appExtAPI: false },
  },
});

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
  const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const isPlayground = process.env.EXPO_PUBLIC_APP_VARIANT === "playground";
  const iosTeamId = process.env.EXPO_IOS_TEAM_ID ?? config.ios?.appleTeamId ?? "B42SPPS3PR";
  return {
    ...config,
    name: isPlayground ? "Seugi Playground" : config.name,
    slug: isPlayground ? "seugi-playground" : config.slug,
    ios: {
      ...config.ios,
      bundleIdentifier: isPlayground ? "com.seugi.playground" : config.ios?.bundleIdentifier,
      appleTeamId: iosTeamId,
      ...(isPlayground ? { entitlements: {} } : {}),
    },
    android: {
      ...config.android,
      package: isPlayground ? "com.seugi.playground" : config.android?.package,
    },
    scheme: isPlayground ? "seugi-playground" : config.scheme,
    extra: {
      ...config.extra,
      appVariant: isPlayground ? "playground" : "production",
      ...(easProjectId ? { eas: { ...config.extra?.eas, projectId: easProjectId } } : {}),
    },
    plugins: [
      [
        "expo-dev-client",
        {
          launchMode: "most-recent",
        },
      ],
      ["expo-secure-store", { configureAndroidBackup: false }],
      ...(isPlayground ? [] : ["expo-apple-authentication"]),
      ...(isPlayground
        ? []
        : [
            ["@bittingz/expo-widgets", createIosWidgetConfig(iosTeamId)],
            withWidgetPodfileFix,
            ["react-native-android-widget", androidWidgetConfig],
          ]),
      ...(config.plugins ?? []),
      ...(iosUrlScheme
        ? [["@react-native-google-signin/google-signin", { iosUrlScheme }] as const]
        : []),
      withAndroidBackupDisabled,
      ...(isPlayground ? [withPlaygroundEntitlements, withPlaygroundUrlScheme] : []),
    ],
  };
};
