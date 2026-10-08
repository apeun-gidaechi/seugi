import { useCallback, useEffect, useState } from "react";
import { Alert, BackHandler, Image, Platform, SafeAreaView, ScrollView, StyleSheet, Text, ToastAndroid, TouchableOpacity, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { PendingWorkspaceRequest, Workspace, WorkspaceSearchSummary } from "@seugi/contracts";
import { Button, Card, type WorkspaceJoinRole } from "../components/ui";
import { api } from "../services/api";
import { pickImageFromLibrary } from "@seugi/media-picker";
import { SeugiTextField } from "../design-system/TextField";
import { SeugiBackIcon } from "../design-system/BackIcon";
import { SeugiAddFillIcon } from "../design-system/AddIcon";
import { WorkspaceRoleSelection } from "../components/WorkspaceRoleSelection";
import { WorkspaceJoinConfirmation } from "../components/WorkspaceJoinConfirmation";
import { WorkspaceJoinCodeScreen } from "./WorkspaceJoinCodeScreen";
import { WorkspaceApprovalScreen } from "./WorkspaceApprovalScreen";
import { joinWorkspaceThenShowWaiting } from "../utils/workspaceJoin";
import { workspaceJoinFailureFeedback, type WorkspaceJoinFailure } from "../utils/workspaceJoinFeedback";
import { workspaceNameValidationMessage, workspaceRequestRoles } from "../utils/workspaceSetup";
import { workspaceCreateFeedback } from "../utils/workspaceCreateFeedback";
import { authPrimaryButtonProps } from "../utils/authButton";

type WorkspaceSetupRoute = "start" | "create" | "role" | "code" | "confirm" | "waiting" | "requests";

export function WorkspaceSetupScreen({ onCreated, onLogout, error, initialRoute = "start", onExit }: { onCreated: () => Promise<void>; onLogout: () => Promise<void>; error?: string; initialRoute?: WorkspaceSetupRoute; onExit?: () => void }) {
  const [routeStack, setRouteStack] = useState<WorkspaceSetupRoute[]>(() => [initialRoute]);
  const screen = routeStack[routeStack.length - 1];
  const navigate = (route: WorkspaceSetupRoute) => setRouteStack((current) => [...current, route]);
  const returnToStart = () => setRouteStack(["start"]);
  const [role, setRole] = useState<WorkspaceJoinRole>("STUDENT");
  const [code, setCode] = useState("");
  const [workspace, setWorkspace] = useState<WorkspaceSearchSummary>();
  const [busy, setBusy] = useState(false);
  const showJoinFailure = (failure: WorkspaceJoinFailure, reason: unknown) => {
    const serverMessage = reason instanceof Error ? reason.message : undefined;
    const feedback = workspaceJoinFailureFeedback(Platform.OS === "ios" ? "ios" : "android", failure, serverMessage);
    if (Platform.OS === "ios") Alert.alert(feedback.title, feedback.message);
    else ToastAndroid.show(feedback.title, ToastAndroid.SHORT);
  };
  const back = () => {
    if (routeStack.length > 1) setRouteStack((current) => current.slice(0, -1));
    else if (screen !== "start") onExit?.();
    else returnToStart();
  };
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (screen === "start" && routeStack.length === 1) return false;
      back();
      return true;
    });
    return () => subscription.remove();
  }, [screen, routeStack.length]);
  const search = async () => {
    if (code.trim().length !== 6 || busy) return;
    setBusy(true);
    try { const result = await api.searchWorkspace(code.trim().toUpperCase()); setWorkspace(result.data); navigate("confirm"); }
    catch (error) { showJoinFailure("search", error); }
    finally { setBusy(false); }
  };
  const join = async () => {
    if (!workspace || busy) return;
    setBusy(true);
    try { await joinWorkspaceThenShowWaiting(() => api.joinWorkspace({ code: code.trim().toUpperCase(), role }), () => navigate("waiting"), onCreated); }
    catch (error) { showJoinFailure("request", error); }
    finally { setBusy(false); }
  };
  if (screen === "confirm" && workspace) {
    return <SafeAreaView style={styles.joinFlowPage}>
      <View style={styles.joinFlowTopBar}><TouchableOpacity accessibilityRole="button" accessibilityLabel="뒤로" onPress={back} style={styles.joinFlowBack}><SeugiBackIcon /></TouchableOpacity><Text style={styles.joinFlowTitle}>학교 가입</Text><View style={styles.joinFlowBack} /></View>
      <WorkspaceJoinConfirmation workspace={workspace} busy={busy} onContinue={() => void join()} />
    </SafeAreaView>;
  }
  const joinFlow = screen === "role" || screen === "code" || screen === "confirm" || screen === "waiting";
  return <SafeAreaView style={joinFlow ? styles.joinFlowPage : styles.auth}>
    {joinFlow ? <View style={styles.joinFlowTopBar}><TouchableOpacity accessibilityRole="button" accessibilityLabel="뒤로" onPress={back} style={styles.joinFlowBack}><SeugiBackIcon /></TouchableOpacity><Text style={styles.joinFlowTitle}>학교 가입</Text><View style={styles.joinFlowBack} /></View> : null}
    {screen === "start" ? <Text style={styles.logo}>스기</Text> : null}
    {!joinFlow && screen !== "start" ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="뒤로" onPress={back} style={styles.backAction}><SeugiBackIcon /> <Text style={styles.link}>뒤로</Text></TouchableOpacity> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {screen === "start" ? <><Text style={styles.subtitle}>학교 워크스페이스를 만들어 시작하거나, 초대 코드로 가입하세요.</Text><Button label="새 학교 만들기" onPress={() => navigate("create")} {...authPrimaryButtonProps(Platform.OS === "ios" ? "ios" : "android")} /><Button label="초대 코드로 가입" kind="secondary" onPress={() => navigate("role")} {...authPrimaryButtonProps(Platform.OS === "ios" ? "ios" : "android")} /><Button label="가입 신청 내역" kind="secondary" onPress={() => navigate("requests")} {...authPrimaryButtonProps(Platform.OS === "ios" ? "ios" : "android")} /><Button label="로그아웃" kind="secondary" onPress={onLogout} {...authPrimaryButtonProps(Platform.OS === "ios" ? "ios" : "android")} /></> : null}
    {screen === "create" ? <ScrollView style={styles.flow}><Text style={styles.subtitle}>새 학교 만들기</Text><CreateWorkspaceCard onCreated={async () => { await onCreated(); if (initialRoute === "start") returnToStart(); else onExit?.(); }} /></ScrollView> : null}
    {screen === "requests" ? <ScrollView style={styles.flow}><Text style={styles.subtitle}>가입 신청 내역</Text><PendingWorkspaceRequests onChanged={onCreated} /></ScrollView> : null}
    {screen === "role" ? <WorkspaceRoleSelection value={role} onChange={setRole} onContinue={() => navigate("code")} /> : null}
    {screen === "code" ? <WorkspaceJoinCodeScreen
      code={code}
      busy={busy}
      onChangeCode={(value) => setCode(value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
      onContinue={() => void search()}
    /> : null}
    {screen === "waiting" && workspace ? <WorkspaceApprovalScreen onDone={initialRoute === "start" ? returnToStart : () => onExit?.()} /> : null}
  </SafeAreaView>;
}

export function CreateWorkspaceCard({ onCreated, presentation = "card" }: { onCreated: () => Promise<void>; presentation?: "card" | "screen" }) {
  const [name, setName] = useState(""); const [image, setImage] = useState<{ uri: string; name: string; mimeType?: string }>(); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(""); const [schoolNameError, setSchoolNameError] = useState(false);
  const pickImage = async () => { try { const asset = await pickImageFromLibrary(); if (asset) { setImage({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType }); setNotice(""); } } catch (error) { setNotice(error instanceof Error ? error.message : "학교 이미지를 선택하지 못했습니다"); } };
  const create = async () => {
    if (busy) return;
    if (name === "") { setSchoolNameError(true); return; }
    setSchoolNameError(false);
    setBusy(true); setNotice("");
    try {
      let imageUrl: string | undefined;
      if (image) {
        try {
          const form = new FormData();
          form.append("file", { uri: image.uri, name: image.name, type: image.mimeType ?? "image/jpeg" } as unknown as Blob);
          const uploaded = await api.uploadFile("IMAGE", form);
          imageUrl = uploaded.data?.url;
          if (!imageUrl) throw new Error("이미지 업로드 응답이 올바르지 않습니다");
        } catch (error) {
          const feedback = workspaceCreateFeedback(Platform.OS === "ios" ? "ios" : "android", "imageUploadFailure");
          if (feedback.kind === "alert") Alert.alert(feedback.title, feedback.message);
          else console.error(error);
          return;
        }
      }
      await api.createWorkspace({ name, image: imageUrl });
      setName("");
      setImage(undefined);
      if (Platform.OS === "ios") {
        const feedback = workspaceCreateFeedback("ios", "success");
        Alert.alert(feedback.title ?? "학교 등록 성공", undefined, [{ text: "닫기", onPress: () => { void onCreated(); } }]);
      } else {
        const feedback = workspaceCreateFeedback("android", "success");
        if (feedback.kind === "toast") ToastAndroid.show(feedback.message, ToastAndroid.SHORT);
        await onCreated();
      }
    } catch (error) {
      const feedback = workspaceCreateFeedback(
        Platform.OS === "ios" ? "ios" : "android",
        "failure",
        error instanceof Error ? error.message : undefined,
      );
      if (feedback.kind === "alert") Alert.alert(feedback.title, feedback.message);
      else if (feedback.kind === "toast") ToastAndroid.show(feedback.message, ToastAndroid.SHORT);
    }
    finally { setBusy(false); }
  };
  const imagePicker = <TouchableOpacity accessibilityRole="button" accessibilityLabel="학교 이미지 추가 (선택)" onPress={() => void pickImage()} disabled={busy} style={styles.workspaceImagePicker}>{image ? <Image source={{ uri: image.uri }} style={styles.workspaceCreateImage} /> : <View style={styles.workspaceCreateImageEmpty}><SeugiAddFillIcon color={SeugiColor.Gray600} /></View>}<Text style={styles.link}>{image ? "이미지 변경" : "학교 이미지 추가 (선택)"}</Text></TouchableOpacity>;
  const nameField = <SeugiTextField label={presentation === "screen" ? "학교 이름" : undefined} value={name} onChangeText={setName} clearable containerStyle={styles.fieldSpacing} placeholder="학교 이름을 입력해 주세요" editable={!busy} />;
  const createButton = <Button label="등록하기" onPress={() => void create()} disabled={busy || (Platform.OS === "ios" && name === "")} loading={busy} {...authPrimaryButtonProps(Platform.OS === "ios" ? "ios" : "android")} />;
  if (presentation === "screen") return <View style={styles.createWorkspacePage}>{imagePicker}<View style={styles.createWorkspaceNameField}>{nameField}</View>{schoolNameError && Platform.OS === "android" ? <Text style={styles.error}>{workspaceNameValidationMessage()}</Text> : null}<View style={styles.createWorkspaceSpacer} />{notice ? <Text style={notice.includes("만들었습니다") ? styles.answer : styles.error}>{notice}</Text> : null}{createButton}</View>;
  return <Card title="새 학교 등록">{imagePicker}{nameField}{schoolNameError ? <Text style={styles.error}>{workspaceNameValidationMessage()}</Text> : null}{createButton}{notice ? <Text style={notice.includes("만들었습니다") ? styles.answer : styles.error}>{notice}</Text> : null}</Card>;
}

export function PendingWorkspaceRequests({ onChanged }: { onChanged?: () => Promise<void> }) {
  const [items, setItems] = useState<PendingWorkspaceRequest[]>([]); const [busyId, setBusyId] = useState(""); const [notice, setNotice] = useState("");
  const refresh = useCallback(async () => { setNotice(""); try { const result = await api.myWaitingWorkspaces(); setItems(result.data ?? []); } catch (error) { setNotice(error instanceof Error ? error.message : "가입 대기 목록을 불러오지 못했습니다"); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const cancel = async (workspace: PendingWorkspaceRequest) => { if (busyId) return; setBusyId(workspace.id); setNotice(""); try { for (const role of workspaceRequestRoles(workspace.requestedRoles)) await api.cancelMyWorkspaceRequest(workspace.id, role); await refresh(); await onChanged?.(); } catch (error) { setNotice(error instanceof Error ? error.message : "가입 신청을 취소하지 못했습니다"); } finally { setBusyId(""); } };
  return <Card title="가입 승인 대기">{items.length ? items.map((workspace) => <View key={workspace.id} style={styles.memberRow}><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{workspace.name}</Text><Text style={styles.muted}>관리자 승인 후 워크스페이스를 사용할 수 있습니다.</Text></View><TouchableOpacity disabled={!!busyId} onPress={() => void cancel(workspace)}><Text style={styles.error}>{busyId === workspace.id ? "취소 중…" : "신청 취소"}</Text></TouchableOpacity></View>) : <Text style={styles.muted}>대기 중인 가입 신청이 없습니다.</Text>}{notice ? <Text style={styles.error}>{notice}</Text> : null}<Button label="대기 목록 새로고침" kind="secondary" onPress={() => void refresh()} disabled={!!busyId} /></Card>;
}

const styles = StyleSheet.create({
  auth: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: SeugiColor.Primary050 },
  joinFlowPage: { flex: 1, backgroundColor: SeugiColor.White },
  joinFlowTopBar: { height: 56, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", backgroundColor: SeugiColor.White },
  joinFlowBack: { width: 40, fontSize: 30, lineHeight: 34 },
  joinFlowTitle: { flex: 1, textAlign: "center", color: SeugiColor.Gray800, fontSize: 18, fontWeight: "700" },
  logo: { color: SeugiColor.Primary500, fontWeight: "800", fontSize: 36, textAlign: "center" },
  subtitle: { textAlign: "center", color: SeugiColor.Gray600, marginVertical: 24 },
  fieldSpacing: { marginBottom: 10 },
  createWorkspacePage: { flex: 1, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: SeugiColor.White },
  workspaceImagePicker: { alignItems: "center", paddingVertical: 16 },
  workspaceCreateImage: { width: 72, height: 72, borderRadius: 36 },
  workspaceCreateImageEmpty: { width: 72, height: 72, borderRadius: 36, backgroundColor: SeugiColor.Gray100, alignItems: "center", justifyContent: "center" },
  createWorkspaceNameField: { paddingHorizontal: 0 },
  createWorkspaceSpacer: { flex: 1 },
  answer: { backgroundColor: SeugiColor.Primary100, padding: 10, borderRadius: 8 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  link: { color: SeugiColor.Primary500 },
  backAction: { flexDirection: "row", alignItems: "center", gap: 4 },
  flow: { flexGrow: 0, maxHeight: "70%" },
  memberRow: { borderBottomWidth: 1, borderColor: SeugiColor.Gray100, paddingVertical: 12, gap: 8 },
  rowTitle: { fontWeight: "600" },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
});
