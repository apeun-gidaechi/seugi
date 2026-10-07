import { useCallback, useEffect, useState } from "react";
import { Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import * as AppleAuthentication from "expo-apple-authentication";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { type Room, type Workspace } from "@seugi/contracts";
import { SeugiColor } from "@seugi/design-tokens";
import { AssignmentsScreen as Assignments } from "./src/screens/AssignmentsScreen";
import { WorkspaceSetupScreen as WorkspaceSetup } from "./src/screens/WorkspaceSetupScreen";
import { NoticesScreen as Notices } from "./src/screens/NoticesScreen";
import { ChatScreen } from "./src/screens/ChatScreen";
import { ChatConversationScreen } from "./src/screens/ChatConversationScreen";
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from "./src/config";
import { Home, MealCalendar, TimetablePage } from "./src/screens/HomeScreen";
import { ProfileScreen as Profile } from "./src/screens/ProfileScreen";
import { AuthScreen } from "./src/screens/AuthScreen";
import { api } from "./src/services/api";
import { localDateKey } from "./src/utils/date";
import { refreshHomeWidgets } from "./src/widgets/refresh";

type Tab = "home" | "meals" | "timetable" | "tasks" | "chat" | "notice" | "profile";
const tabs: Array<[Tab, string]> = [["home", "홈"], ["meals", "급식"], ["timetable", "시간표"], ["tasks", "과제"], ["chat", "채팅"], ["notice", "공지"], ["profile", "프로필"]];
const accessTokenKey = "seugi.access-token";
const refreshTokenKey = "seugi.refresh-token";
const workspaceIdKey = "seugi.workspace-id";
if (GOOGLE_WEB_CLIENT_ID) GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, iosClientId: GOOGLE_IOS_CLIENT_ID || undefined, offlineAccess: true, forceCodeForRefreshToken: true, scopes: ["https://www.googleapis.com/auth/classroom.courses.readonly", "https://www.googleapis.com/auth/classroom.coursework.me.readonly", "https://www.googleapis.com/auth/classroom.coursework.students.readonly"] });
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowAlert: true, shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [authenticated, setAuthenticated] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace>();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState(""); const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [hydrated, setHydrated] = useState(false); const [deviceToken, setDeviceToken] = useState<string>();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const signedIn = authenticated && !!workspace;
  const load = useCallback(async () => { const list = (await api.workspaces()).data ?? []; setWorkspaces(list); const storedId = await SecureStore.getItemAsync(workspaceIdKey); const selected = list.find((item) => item.id === storedId) ?? list[0]; setWorkspace((current) => current && list.find((item) => item.id === current.id) || selected); if (selected) await SecureStore.setItemAsync(workspaceIdKey, selected.id); }, []);
  const selectWorkspace = useCallback((selected: Workspace) => { setWorkspace(selected); void SecureStore.setItemAsync(workspaceIdKey, selected.id).then(() => refreshHomeWidgets()).catch(() => undefined); }, []);
  useEffect(() => { let active = true; (async () => { let token = await SecureStore.getItemAsync(accessTokenKey); const refreshToken = await SecureStore.getItemAsync(refreshTokenKey); api.setRefreshToken(refreshToken ?? undefined); if (token) { api.setToken(token); try { await load(); } catch { if (!refreshToken) throw new Error("세션이 만료되었습니다"); const refreshed = await api.refreshAccessToken(refreshToken); if (!refreshed.data) throw new Error("세션을 갱신하지 못했습니다"); token = refreshed.data; api.setToken(token); await SecureStore.setItemAsync(accessTokenKey, token); await load(); } if (active) setAuthenticated(true); } if (active) setHydrated(true); })().catch(async () => { api.setToken(); api.setRefreshToken(); await SecureStore.deleteItemAsync(accessTokenKey); await SecureStore.deleteItemAsync(refreshTokenKey); if (active) setHydrated(true); }); return () => { active = false; }; }, [load]);
  useEffect(() => { if (!signedIn) return; let active = true; void refreshHomeWidgets().catch(() => undefined); (async () => { if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("default", { name: "기본", importance: Notifications.AndroidImportance.DEFAULT }); const current = await Notifications.getPermissionsAsync(); const permission = current.status === "granted" ? current : await Notifications.requestPermissionsAsync(); if (permission.status !== "granted") return; const token = (await Notifications.getExpoPushTokenAsync()).data; await api.registerDeviceToken(token); if (active) setDeviceToken(token); })().catch(() => undefined); return () => { active = false; }; }, [signedIn]);
  const persistSession = useCallback(async (token?: string, refreshToken?: string) => { if (!token) throw new Error("액세스 토큰을 받지 못했습니다"); api.setToken(token); api.setRefreshToken(refreshToken); await SecureStore.setItemAsync(accessTokenKey, token); if (refreshToken) await SecureStore.setItemAsync(refreshTokenKey, refreshToken); await load(); setAuthenticated(true); }, [load]);
  const authenticate = useCallback(async (register = false) => { setLoading(true); setError(""); try { const response = register ? await api.register({ email, password, name, code }) : await api.login({ email, password }); await persistSession(response.data?.accessToken, response.data?.refreshToken); } catch (reason) { setError(reason instanceof Error ? reason.message : "로그인에 실패했습니다"); } finally { setLoading(false); } }, [email, password, name, code, persistSession]);
  const authenticateGoogle = useCallback(async (code: string) => { setLoading(true); setError(""); try { const response = await api.authenticateGoogle({ code, platform: Platform.OS === "ios" ? "IOS" : "ANDROID", name: name || undefined }); await persistSession(response.data?.accessToken, response.data?.refreshToken); } catch (reason) { setError(reason instanceof Error ? reason.message : "Google 로그인에 실패했습니다"); } finally { setLoading(false); } }, [name, persistSession]);
  useEffect(() => { if (Platform.OS === "ios") AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false)); }, []);
  const authenticateApple = useCallback(async () => {
    if (loading) return;
    setLoading(true); setError("");
    try {
      const credential = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL] });
      if (!credential.authorizationCode) throw new Error("Apple 인증 코드를 받지 못했습니다");
      const fullName = credential.fullName;
      const appleName = fullName ? [fullName.familyName, fullName.givenName].filter(Boolean).join("") : "";
      const response = await api.authenticateApple({ code: credential.authorizationCode, platform: "IOS", name: appleName || name || undefined });
      await persistSession(response.data?.accessToken, response.data?.refreshToken);
    } catch (reason) {
      if (!(reason instanceof Error) || !("code" in reason) || reason.code !== "ERR_REQUEST_CANCELED") setError(reason instanceof Error ? reason.message : "Apple 로그인에 실패했습니다");
    } finally { setLoading(false); }
  }, [loading, name, persistSession]);
  if (!authenticated) return <AuthScreen hydrated={hydrated} appleAvailable={appleAvailable} loading={loading} error={error} email={email} password={password} name={name} code={code} onEmailChange={setEmail} onPasswordChange={setPassword} onNameChange={setName} onCodeChange={setCode} onGoogleCode={authenticateGoogle} onAppleSignIn={authenticateApple} onError={setError} onSendVerification={() => { void api.sendVerification(email).then(() => setError("인증 코드를 발송했습니다.")).catch((e) => setError(e.message)); }} onLogin={() => { void authenticate(false); }} onRegister={() => { void authenticate(true); }} />;
  if (!workspace) return <WorkspaceSetup onCreated={load} onLogout={async () => { api.setToken(); api.setRefreshToken(); await SecureStore.deleteItemAsync(accessTokenKey); await SecureStore.deleteItemAsync(refreshTokenKey); setAuthenticated(false); }} />;
  return <SafeAreaView style={styles.page}><View style={styles.header}><Text style={styles.title}>{workspace?.name ?? "스기"}</Text><TouchableOpacity onPress={() => load().catch((reason) => setError(String(reason)))}><Text style={styles.link}>새로고침</Text></TouchableOpacity></View>{error ? <Text style={styles.error}>{error}</Text> : null}{tab === "home" && <Home workspace={workspace!} />}{tab === "meals" && <MealCalendar workspace={workspace!} />}{tab === "timetable" && <TimetablePage workspace={workspace!} />}{tab === "tasks" && <Assignments workspace={workspace!} />}{tab === "chat" && <Chat workspace={workspace!} />}{tab === "notice" && <Notices workspace={workspace!} />}{tab === "profile" && <Profile workspaces={workspaces} workspace={workspace!} onSelect={selectWorkspace} onReload={load} onLogout={async () => { if (deviceToken) await api.removeDeviceToken(deviceToken).catch(() => undefined); api.setToken(); api.setRefreshToken(); await SecureStore.deleteItemAsync(accessTokenKey); await SecureStore.deleteItemAsync(refreshTokenKey); await SecureStore.deleteItemAsync(workspaceIdKey); setDeviceToken(undefined); setWorkspace(undefined); setAuthenticated(false); void refreshHomeWidgets().catch(() => undefined); }} />}<View style={styles.tabbar}>{tabs.map(([key, label]) => <TouchableOpacity key={key} onPress={() => setTab(key)} style={styles.tab}><Text style={tab === key ? styles.activeTab : styles.inactiveTab}>{label}</Text></TouchableOpacity>)}</View></SafeAreaView>;
}


function Chat({ workspace }: { workspace: Workspace }) {
  return <ChatScreen workspace={workspace} RoomMessagesComponent={RoomMessages} />;
}
function RoomMessages({ room, onBack }: { room: Room; onBack: () => void }) {
  return <ChatConversationScreen room={room} onBack={onBack} />;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: SeugiColor.Primary050 }, header: { height: 58, backgroundColor: SeugiColor.White, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, title: { fontSize: 20, fontWeight: "700" }, link: { color: SeugiColor.Primary500 }, tabbar: { height: 64, flexDirection: "row", backgroundColor: SeugiColor.White, borderTopWidth: 1, borderColor: SeugiColor.Gray300 }, tab: { flex: 1, justifyContent: "center", alignItems: "center" }, activeTab: { color: SeugiColor.Primary500, fontWeight: "700" }, inactiveTab: { color: SeugiColor.Gray500 }, error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" } });
