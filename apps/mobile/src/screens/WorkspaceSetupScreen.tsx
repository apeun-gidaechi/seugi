import { useCallback, useEffect, useState } from "react";
import { BackHandler, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { SeugiColor } from "@seugi/design-tokens";
import type { Workspace, WorkspaceSearchSummary } from "@seugi/contracts";
import { Button, Card, type WorkspaceJoinRole } from "../components/ui";
import { api } from "../services/api";
import { SeugiCodeTextField, SeugiTextField } from "../design-system/TextField";
import { WorkspaceRoleSelection } from "../components/WorkspaceRoleSelection";
import { WorkspaceJoinConfirmation } from "../components/WorkspaceJoinConfirmation";

export function WorkspaceSetupScreen({ onCreated, onLogout, error }: { onCreated: () => Promise<void>; onLogout: () => Promise<void>; error?: string }) {
  const [screen, setScreen] = useState<"start" | "create" | "role" | "code" | "confirm" | "waiting" | "requests">("start");
  const [role, setRole] = useState<WorkspaceJoinRole>("STUDENT");
  const [code, setCode] = useState("");
  const [workspace, setWorkspace] = useState<WorkspaceSearchSummary>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (screen !== "waiting") return;
    const timer = setInterval(() => { void onCreated().catch(() => undefined); }, 10_000);
    return () => clearInterval(timer);
  }, [screen, onCreated]);
  const back = () => setScreen((current) => current === "confirm" ? "code" : current === "code" ? "role" : current === "role" || current === "create" ? "start" : "start");
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (screen === "start" || screen === "waiting") return false;
      back();
      return true;
    });
    return () => subscription.remove();
  }, [screen]);
  const search = async () => {
    if (code.trim().length !== 6 || busy) return;
    setBusy(true); setMessage("");
    try { const result = await api.searchWorkspace(code.trim().toUpperCase()); setWorkspace(result.data); setScreen("confirm"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "학교를 찾지 못했습니다"); }
    finally { setBusy(false); }
  };
  const join = async () => {
    if (!workspace || busy) return;
    setBusy(true); setMessage("");
    try { await api.joinWorkspace({ code: code.trim().toUpperCase(), role }); await onCreated(); setScreen("waiting"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "가입 신청에 실패했습니다"); }
    finally { setBusy(false); }
  };
  if (screen === "confirm" && workspace) {
    return <SafeAreaView style={styles.joinFlowPage}>
      <View style={styles.joinFlowTopBar}><TouchableOpacity accessibilityRole="button" accessibilityLabel="뒤로" onPress={back} style={styles.joinFlowBack}><Text style={styles.link}>‹</Text></TouchableOpacity><Text style={styles.joinFlowTitle}>학교 가입</Text><View style={styles.joinFlowBack} /></View>
      <WorkspaceJoinConfirmation workspace={workspace} busy={busy} error={message} onContinue={() => void join()} />
    </SafeAreaView>;
  }
  const joinFlow = screen === "role" || screen === "code" || screen === "confirm";
  return <SafeAreaView style={joinFlow ? styles.joinFlowPage : styles.auth}>
    {joinFlow ? <View style={styles.joinFlowTopBar}><TouchableOpacity accessibilityRole="button" accessibilityLabel="뒤로" onPress={back} style={styles.joinFlowBack}><Text style={styles.link}>‹</Text></TouchableOpacity><Text style={styles.joinFlowTitle}>학교 가입</Text><View style={styles.joinFlowBack} /></View> : null}
    {screen === "start" ? <Text style={styles.logo}>스기</Text> : null}
    {!joinFlow && screen !== "start" && screen !== "waiting" ? <TouchableOpacity onPress={back}><Text style={styles.link}>‹ 뒤로</Text></TouchableOpacity> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {screen === "start" ? <><Text style={styles.subtitle}>학교 워크스페이스를 만들어 시작하거나, 초대 코드로 가입하세요.</Text><Button label="새 학교 만들기" onPress={() => setScreen("create")} /><Button label="초대 코드로 가입" kind="secondary" onPress={() => setScreen("role")} /><Button label="가입 신청 내역" kind="secondary" onPress={() => setScreen("requests")} /><Button label="로그아웃" kind="secondary" onPress={onLogout} /></> : null}
    {screen === "create" ? <ScrollView style={styles.flow}><Text style={styles.subtitle}>새 학교 만들기</Text><CreateWorkspaceCard onCreated={onCreated} /></ScrollView> : null}
    {screen === "requests" ? <ScrollView style={styles.flow}><Text style={styles.subtitle}>가입 신청 내역</Text><PendingWorkspaceRequests onChanged={onCreated} /></ScrollView> : null}
    {screen === "role" ? <WorkspaceRoleSelection value={role} onChange={setRole} onContinue={() => setScreen("code")} /> : null}
    {screen === "code" ? <><Text style={styles.subtitle}>학교 초대 코드를 입력해 주세요.</Text><SeugiCodeTextField value={code} onChangeText={(value) => setCode(value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())} keyboardType="default" autoCapitalize="characters" autoCorrect={false} accessibilityLabel="학교 코드" label="학교 코드" containerStyle={styles.codeSpacing} />{message ? <Text style={styles.error}>{message}</Text> : null}<Button label={busy ? "학교 확인 중…" : "계속하기"} onPress={() => void search()} disabled={busy || code.length !== 6} /></> : null}
    {screen === "waiting" && workspace ? <WorkspaceApprovalScreen workspace={workspace} onDone={() => setScreen("start")} /> : null}
  </SafeAreaView>;
}

export function WorkspaceApprovalScreen({ workspace, onDone }: { workspace: WorkspaceSearchSummary; onDone: () => void }) {
  return <View style={styles.approvalScreen}>
    <View style={styles.approvalSpacer} />
    <View style={styles.approvalContent}>
      {workspace.workspaceImageUrl ? <Image source={{ uri: workspace.workspaceImageUrl }} style={styles.approvalImage} /> : <View style={styles.approvalImageFallback}><Text style={styles.approvalSchoolIcon}>⌂</Text></View>}
      <Text style={styles.approvalSchoolName}>{workspace.workspaceName}</Text>
      <View style={styles.approvalTooltip}><Text style={styles.approvalTooltipText}>가입 수락을 대기중이에요</Text></View>
    </View>
    <View style={styles.approvalSpacer} />
    <Button label="완료" onPress={onDone} />
  </View>;
}

export function CreateWorkspaceCard({ onCreated, presentation = "card" }: { onCreated: () => Promise<void>; presentation?: "card" | "screen" }) {
  const [name, setName] = useState(""); const [image, setImage] = useState<{ uri: string; name: string; mimeType?: string }>(); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState("");
  const pickImage = async () => { try { const result = await DocumentPicker.getDocumentAsync({ type: "image/*", copyToCacheDirectory: true, multiple: false }); if (!result.canceled && result.assets[0]) { const asset = result.assets[0]; setImage({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? undefined }); setNotice(""); } } catch (error) { setNotice(error instanceof Error ? error.message : "학교 이미지를 선택하지 못했습니다"); } };
  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy(true); setNotice("");
    try {
      let imageUrl: string | undefined;
      if (image) { const form = new FormData(); form.append("file", { uri: image.uri, name: image.name, type: image.mimeType ?? "image/jpeg" } as unknown as Blob); const uploaded = await api.uploadFile("IMAGE", form); imageUrl = uploaded.data?.url; if (!imageUrl) throw new Error("이미지 업로드 응답이 올바르지 않습니다"); }
      await api.createWorkspace({ name: name.trim(), image: imageUrl }); setName(""); setImage(undefined); await onCreated(); setNotice("워크스페이스를 만들었습니다.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "워크스페이스 생성에 실패했습니다"); }
    finally { setBusy(false); }
  };
  const imagePicker = <TouchableOpacity accessibilityRole="button" accessibilityLabel="학교 이미지 추가 (선택)" onPress={() => void pickImage()} disabled={busy} style={styles.workspaceImagePicker}>{image ? <Image source={{ uri: image.uri }} style={styles.workspaceCreateImage} /> : <View style={styles.workspaceCreateImageEmpty}><Text style={styles.link}>＋</Text></View>}<Text style={styles.link}>{image ? "이미지 변경" : "학교 이미지 추가 (선택)"}</Text></TouchableOpacity>;
  const nameField = <SeugiTextField label={presentation === "screen" ? "학교 이름" : undefined} value={name} onChangeText={setName} containerStyle={styles.fieldSpacing} placeholder="학교 이름을 입력해 주세요" maxLength={80} editable={!busy} />;
  const createButton = <Button label={busy ? "등록 중…" : "등록하기"} onPress={() => void create()} disabled={busy || !name.trim()} />;
  if (presentation === "screen") return <View style={styles.createWorkspacePage}>{imagePicker}<View style={styles.createWorkspaceNameField}>{nameField}</View><View style={styles.createWorkspaceSpacer} />{notice ? <Text style={notice.includes("만들었습니다") ? styles.answer : styles.error}>{notice}</Text> : null}{createButton}</View>;
  return <Card title="새 학교 등록">{imagePicker}{nameField}{createButton}{notice ? <Text style={notice.includes("만들었습니다") ? styles.answer : styles.error}>{notice}</Text> : null}</Card>;
}

export function PendingWorkspaceRequests({ onChanged }: { onChanged?: () => Promise<void> }) {
  const [items, setItems] = useState<Workspace[]>([]); const [busyId, setBusyId] = useState(""); const [notice, setNotice] = useState("");
  const refresh = useCallback(async () => { setNotice(""); try { const result = await api.myWaitingWorkspaces(); setItems(result.data ?? []); } catch (error) { setNotice(error instanceof Error ? error.message : "가입 대기 목록을 불러오지 못했습니다"); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const cancel = async (workspace: Workspace) => { if (busyId) return; setBusyId(workspace.id); setNotice(""); try { await api.cancelMyWorkspaceRequest(workspace.id); await refresh(); await onChanged?.(); } catch (error) { setNotice(error instanceof Error ? error.message : "가입 신청을 취소하지 못했습니다"); } finally { setBusyId(""); } };
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
  codeSpacing: { marginVertical: 8 },
  createWorkspacePage: { flex: 1, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: SeugiColor.White },
  workspaceImagePicker: { alignItems: "center", paddingVertical: 16 },
  workspaceCreateImage: { width: 72, height: 72, borderRadius: 36 },
  workspaceCreateImageEmpty: { width: 72, height: 72, borderRadius: 36, backgroundColor: SeugiColor.Gray100, alignItems: "center", justifyContent: "center" },
  createWorkspaceNameField: { paddingHorizontal: 0 },
  createWorkspaceSpacer: { flex: 1 },
  answer: { backgroundColor: SeugiColor.Primary100, padding: 10, borderRadius: 8 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  link: { color: SeugiColor.Primary500 },
  flow: { flexGrow: 0, maxHeight: "70%" },
  approvalScreen: { flex: 1, justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  approvalSpacer: { flex: 1 },
  approvalContent: { alignItems: "center", paddingHorizontal: 28 },
  approvalImage: { width: 145, height: 145, resizeMode: "contain" },
  approvalImageFallback: { width: 145, height: 145, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: SeugiColor.Primary100 },
  approvalSchoolIcon: { color: SeugiColor.Primary500, fontSize: 78, lineHeight: 90 },
  approvalSchoolName: { color: SeugiColor.Gray800, fontSize: 18, fontWeight: "700", textAlign: "center", marginTop: 12 },
  approvalTooltip: { alignSelf: "flex-end", marginTop: 16, backgroundColor: SeugiColor.Primary100, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
  approvalTooltipText: { color: SeugiColor.Primary700, fontSize: 13 },
  memberRow: { borderBottomWidth: 1, borderColor: SeugiColor.Gray100, paddingVertical: 12, gap: 8 },
  rowTitle: { fontWeight: "600" },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
});
