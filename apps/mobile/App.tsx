import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import * as AppleAuthentication from "expo-apple-authentication";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { type Workspace } from "@seugi/contracts";
import { WorkspaceSetupScreen as WorkspaceSetup } from "./src/screens/WorkspaceSetupScreen";
import { EAS_PROJECT_ID, GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from "./src/config";
import { AuthScreen } from "./src/screens/AuthScreen";
import {
  AuthenticatedAppShell,
  type Tab,
} from "./src/screens/AuthenticatedAppShell";
import { api } from "./src/services/api";
import { localDateKey } from "./src/utils/date";
import { refreshHomeWidgets } from "./src/widgets/refresh";

const accessTokenKey = "seugi.access-token";
const refreshTokenKey = "seugi.refresh-token";
const workspaceIdKey = "seugi.workspace-id";
if (GOOGLE_WEB_CLIENT_ID)
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    offlineAccess: true,
    forceCodeForRefreshToken: true,
    scopes: [
      "https://www.googleapis.com/auth/classroom.courses.readonly",
      "https://www.googleapis.com/auth/classroom.coursework.me.readonly",
      "https://www.googleapis.com/auth/classroom.coursework.students.readonly",
    ],
  });
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [authenticated, setAuthenticated] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace>();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [deviceToken, setDeviceToken] = useState<string>();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const signedIn = authenticated && !!workspace;
  const load = useCallback(async () => {
    const list = (await api.workspaces()).data ?? [];
    setWorkspaces(list);
    const storedId = await SecureStore.getItemAsync(workspaceIdKey);
    const selected = list.find((item) => item.id === storedId) ?? list[0];
    setWorkspace(
      (current) =>
        (current && list.find((item) => item.id === current.id)) || selected,
    );
    if (selected) await SecureStore.setItemAsync(workspaceIdKey, selected.id);
  }, []);
  const reload = useCallback(async () => {
    try {
      await load();
    } catch (reason) {
      setError(String(reason));
      throw reason;
    }
  }, [load]);
  const selectWorkspace = useCallback((selected: Workspace) => {
    setWorkspace(selected);
    void SecureStore.setItemAsync(workspaceIdKey, selected.id)
      .then(() => refreshHomeWidgets())
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    let active = true;
    (async () => {
      let token = await SecureStore.getItemAsync(accessTokenKey);
      const refreshToken = await SecureStore.getItemAsync(refreshTokenKey);
      api.setRefreshToken(refreshToken ?? undefined);
      if (token) {
        api.setToken(token);
        try {
          await load();
        } catch {
          if (!refreshToken) throw new Error("세션이 만료되었습니다");
          const refreshed = await api.refreshAccessToken(refreshToken);
          if (!refreshed.data) throw new Error("세션을 갱신하지 못했습니다");
          token = refreshed.data;
          api.setToken(token);
          await SecureStore.setItemAsync(accessTokenKey, token);
          await load();
        }
        if (active) setAuthenticated(true);
      }
      if (active) setHydrated(true);
    })().catch(async () => {
      api.setToken();
      api.setRefreshToken();
      await SecureStore.deleteItemAsync(accessTokenKey);
      await SecureStore.deleteItemAsync(refreshTokenKey);
      if (active) setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, [load]);
  useEffect(() => {
    if (!authenticated || Platform.OS === "web") return;
    let active = true;
    if (signedIn) void refreshHomeWidgets().catch(() => undefined);
    (async () => {
      if (!EAS_PROJECT_ID) {
        console.warn(
          "[notifications] EXPO_PUBLIC_EAS_PROJECT_ID is not configured; push registration was skipped.",
        );
        return;
      }
      if (Platform.OS === "android")
        await Notifications.setNotificationChannelAsync("default", {
          name: "기본",
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      const current = await Notifications.getPermissionsAsync();
      const permission =
        current.status === "granted"
          ? current
          : await Notifications.requestPermissionsAsync();
      if (permission.status !== "granted") return;
      const token = (await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID })).data;
      await api.registerDeviceToken(token);
      if (active) setDeviceToken(token);
    })().catch((reason: unknown) => {
      if (active)
        console.warn(
          "[notifications] Push registration failed.",
          reason,
        );
    });
    return () => {
      active = false;
    };
  }, [authenticated, signedIn]);
  const persistSession = useCallback(
    async (token?: string, refreshToken?: string) => {
      if (!token) throw new Error("액세스 토큰을 받지 못했습니다");
      api.setToken(token);
      api.setRefreshToken(refreshToken);
      await SecureStore.setItemAsync(accessTokenKey, token);
      if (refreshToken)
        await SecureStore.setItemAsync(refreshTokenKey, refreshToken);
      await load();
      setAuthenticated(true);
    },
    [load],
  );
  const authenticate = useCallback(
    async (register = false) => {
      setLoading(true);
      setError("");
      try {
        const response = register
          ? await api.register({ email, password, name, code })
          : await api.login({ email, password });
        await persistSession(
          response.data?.accessToken,
          response.data?.refreshToken,
        );
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "로그인에 실패했습니다",
        );
      } finally {
        setLoading(false);
      }
    },
    [email, password, name, code, persistSession],
  );
  const authenticateGoogle = useCallback(
    async (code: string) => {
      setLoading(true);
      setError("");
      try {
        const response = await api.authenticateGoogle({
          code,
          platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
          name: name || undefined,
        });
        await persistSession(
          response.data?.accessToken,
          response.data?.refreshToken,
        );
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Google 로그인에 실패했습니다",
        );
      } finally {
        setLoading(false);
      }
    },
    [name, persistSession],
  );
  useEffect(() => {
    if (Platform.OS === "ios")
      AppleAuthentication.isAvailableAsync()
        .then(setAppleAvailable)
        .catch(() => setAppleAvailable(false));
  }, []);
  const authenticateApple = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.authorizationCode)
        throw new Error("Apple 인증 코드를 받지 못했습니다");
      const fullName = credential.fullName;
      const appleName = fullName
        ? [fullName.familyName, fullName.givenName].filter(Boolean).join("")
        : "";
      const response = await api.authenticateApple({
        code: credential.authorizationCode,
        platform: "IOS",
        name: appleName || name || undefined,
      });
      await persistSession(
        response.data?.accessToken,
        response.data?.refreshToken,
      );
    } catch (reason) {
      if (
        !(reason instanceof Error) ||
        !("code" in reason) ||
        reason.code !== "ERR_REQUEST_CANCELED"
      )
        setError(
          reason instanceof Error
            ? reason.message
            : "Apple 로그인에 실패했습니다",
        );
    } finally {
      setLoading(false);
    }
  }, [loading, name, persistSession]);
  if (!authenticated)
    return (
      <AuthScreen
        hydrated={hydrated}
        appleAvailable={appleAvailable}
        loading={loading}
        error={error}
        email={email}
        password={password}
        confirmPassword={confirmPassword}
        name={name}
        code={code}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onNameChange={setName}
        onCodeChange={setCode}
        onGoogleCode={authenticateGoogle}
        onAppleSignIn={authenticateApple}
        onError={setError}
        onSendVerification={async () => {
          setError("");
          try {
            await api.sendVerification(email);
            setError("인증 코드를 발송했습니다.");
            return true;
          } catch (e) {
            setError(e instanceof Error ? e.message : "인증 코드를 발송하지 못했습니다");
            return false;
          }
        }}
        onLogin={() => {
          void authenticate(false);
        }}
        onRegister={() => {
          void authenticate(true);
        }}
      />
    );
  if (!workspace)
    return (
      <WorkspaceSetup
        error={error}
        onCreated={load}
        onLogout={async () => {
          await api.logout(deviceToken).catch(() => undefined);
          api.setToken();
          api.setRefreshToken();
          await SecureStore.deleteItemAsync(accessTokenKey);
          await SecureStore.deleteItemAsync(refreshTokenKey);
          setDeviceToken(undefined);
          setError("");
          setAuthenticated(false);
        }}
      />
    );
  return (
    <AuthenticatedAppShell
      tab={tab}
      workspace={workspace}
      workspaces={workspaces}
      error={error}
      onTabChange={setTab}
      onReload={reload}
      onSelectWorkspace={selectWorkspace}
      onLogout={async () => {
        if (deviceToken)
          await api.removeDeviceToken(deviceToken).catch(() => undefined);
        api.setToken();
        api.setRefreshToken();
        await SecureStore.deleteItemAsync(accessTokenKey);
        await SecureStore.deleteItemAsync(refreshTokenKey);
        await SecureStore.deleteItemAsync(workspaceIdKey);
        setDeviceToken(undefined);
        setWorkspace(undefined);
        setAuthenticated(false);
        void refreshHomeWidgets().catch(() => undefined);
      }}
    />
  );
}
