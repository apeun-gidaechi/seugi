import { useCallback, useEffect, useState } from "react";
import { Image, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { SeugiColor } from "@seugi/design-tokens";
import type { Workspace } from "@seugi/contracts";
import { Button, Card, WorkspaceRolePicker, type WorkspaceJoinRole } from "../components/ui";
import { api } from "../services/api";

export function WorkspaceSetupScreen({ onCreated, onLogout }: { onCreated: () => Promise<void>; onLogout: () => Promise<void> }) {
  const [code, setCode] = useState(""); const [joinRole, setJoinRole] = useState<WorkspaceJoinRole>("STUDENT"); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const join = async () => { if (!code.trim() || busy) return; setBusy(true); setMessage(""); try { await api.joinWorkspace({ code: code.trim().toUpperCase(), role: joinRole }); setMessage("가입 신청을 보냈습니다. 아래 대기 목록에서 상태를 확인할 수 있습니다."); setCode(""); } catch (e) { setMessage(e instanceof Error ? e.message : "가입 신청에 실패했습니다"); } finally { setBusy(false); } };
  return <SafeAreaView style={styles.auth}><Text style={styles.logo}>스기</Text><Text style={styles.subtitle}>학교 워크스페이스를 만들거나 초대 코드로 가입하세요.</Text><CreateWorkspaceCard onCreated={onCreated} /><Card title="초대 코드로 가입"><TextInput value={code} onChangeText={setCode} style={styles.input} autoCapitalize="characters" placeholder="초대 코드" /><WorkspaceRolePicker value={joinRole} onChange={setJoinRole} /><Button label={busy ? "처리 중…" : "가입 신청"} onPress={join} disabled={busy || !code.trim()} /></Card>{message ? <Text style={styles.answer}>{message}</Text> : null}<PendingWorkspaceRequests onChanged={onCreated} /><Button label="새로고침" kind="secondary" onPress={onCreated} /><Button label="로그아웃" kind="secondary" onPress={onLogout} /></SafeAreaView>;
}

export function CreateWorkspaceCard({ onCreated }: { onCreated: () => Promise<void> }) {
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
  return <Card title="새 학교 등록"><TouchableOpacity onPress={() => void pickImage()} disabled={busy} style={{ alignItems: "center", paddingVertical: 8 }}>{image ? <Image source={{ uri: image.uri }} style={{ width: 72, height: 72, borderRadius: 36 }} /> : <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: SeugiColor.Primary100, alignItems: "center", justifyContent: "center" }}><Text style={styles.link}>＋</Text></View>}<Text style={styles.link}>{image ? "이미지 변경" : "학교 이미지 추가 (선택)"}</Text></TouchableOpacity><TextInput value={name} onChangeText={setName} style={styles.input} placeholder="학교 이름을 입력해 주세요" maxLength={80} /><Button label={busy ? "등록 중…" : "등록하기"} onPress={() => void create()} disabled={busy || !name.trim()} />{notice ? <Text style={notice.includes("만들었습니다") ? styles.answer : styles.error}>{notice}</Text> : null}</Card>;
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
  logo: { color: SeugiColor.Primary500, fontWeight: "800", fontSize: 36, textAlign: "center" },
  subtitle: { textAlign: "center", color: SeugiColor.Gray600, marginVertical: 24 },
  input: { backgroundColor: SeugiColor.White, borderWidth: 1, borderColor: SeugiColor.Gray300, borderRadius: 10, padding: 13, marginBottom: 10 },
  answer: { backgroundColor: SeugiColor.Primary100, padding: 10, borderRadius: 8 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  link: { color: SeugiColor.Primary500 },
  memberRow: { borderBottomWidth: 1, borderColor: SeugiColor.Gray100, paddingVertical: 12, gap: 8 },
  rowTitle: { fontWeight: "600" },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
});
