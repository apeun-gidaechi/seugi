import type { ExpoConfig, ConfigContext } from "expo/config";
import { withAndroidManifest, withPodfile } from "expo/config-plugins";

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

const iosWidgetConfig = {
  ios: {
    src: "./src/widgets/ios",
    deploymentTarget: "16.2",
    useLiveActivities: false,
    frequentUpdates: false,
    // The widget config plugin emits invalid `DEVELOPMENT_TEAM = ;` when this is empty.
    // Use a syntactically valid placeholder for simulator builds; device builds must set a real team.
    devTeamId: process.env.EXPO_IOS_TEAM_ID ?? "0000000000",
    moduleDependencies: [],
    mode: "development" as const,
    widgetExtPlugins: [],
    xcode: { appGroupId: "group.com.seugi.app.expowidgets", appExtAPI: false },
  },
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const iosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;
  const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  return {
    ...config,
    extra: {
      ...config.extra,
      ...(easProjectId ? { eas: { ...config.extra?.eas, projectId: easProjectId } } : {}),
    },
    plugins: [
      ["expo-secure-store", { configureAndroidBackup: false }],
      "expo-apple-authentication",
      ["@bittingz/expo-widgets", iosWidgetConfig],
      withWidgetPodfileFix,
      ["react-native-android-widget", androidWidgetConfig],
      ...(config.plugins ?? []),
      ...(iosUrlScheme
        ? [["@react-native-google-signin/google-signin", { iosUrlScheme }] as const]
        : []),
      withAndroidBackupDisabled,
    ],
  };
};
