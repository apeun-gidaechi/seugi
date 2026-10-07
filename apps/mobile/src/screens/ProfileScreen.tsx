import { useCallback, useEffect, useState } from "react";
import { Alert, BackHandler, Image, Linking, Modal, Platform, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { SeugiColor } from "@seugi/design-tokens";
import type { Member, Role, Workspace, WorkspaceMemberChart, WorkspaceSearchSummary } from "@seugi/contracts";
import { Button, Card, WorkspaceRolePicker, type WorkspaceJoinRole } from "../components/ui";
import { CreateWorkspaceCard, PendingWorkspaceRequests } from "./WorkspaceSetupScreen";
import { api } from "../services/api";
import { absoluteApiUrl } from "../utils/url";

export function ProfileScreen({ workspace, onOpenSettings }: { workspace: Workspace; onOpenSettings: () => void }) {
  return <ScrollView style={styles.content}><ProfileEditor workspace={workspace} onOpenSettings={onOpenSettings} /></ScrollView>;
}

export function AccountSettingsScreen({ workspace, onLogout }: { workspace: Workspace; onLogout: () => void | Promise<void> }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const signOut = async () => { await api.logout().catch(() => undefined); await onLogout(); };
  const openPolicy = (url: string) => { void Linking.openURL(url).catch(() => setMessage("정책 페이지를 열지 못했습니다. 잠시 후 다시 시도해 주세요.")); };
  const withdraw = () => Alert.alert("회원 탈퇴", "계정과 연결된 데이터에 접근할 수 없게 됩니다. 탈퇴를 진행할까요?", [
    { text: "취소", style: "cancel" },
    { text: "탈퇴", style: "destructive", onPress: () => { void (async () => { setBusy(true); setMessage(""); try { await api.removeMember(); await onLogout(); } catch (e) { setMessage(e instanceof Error ? e.message : "회원 탈퇴에 실패했습니다"); } finally { setBusy(false); } })(); } },
  ]);
  return <ScrollView style={styles.content}><ProfileIdentitySettings workspace={workspace} /><Card title="안내"><Button label="개인정보 처리 방침" kind="secondary" onPress={() => openPolicy("https://byungjjun.notion.site/58f95c1209fb48b4b74434701290f838")} /><Button label="서비스 운영 정책" kind="secondary" onPress={() => openPolicy("https://byungjjun.notion.site/5ba79e224f53439bbfa3607e581fe6bf")} /></Card><Button label="로그아웃" kind="secondary" onPress={signOut} disabled={busy} /><Button label="회원 탈퇴" kind="secondary" onPress={withdraw} disabled={busy} />{message ? <Text style={styles.error}>{message}</Text> : null}</ScrollView>;
}

function ProfileIdentitySettings({ workspace }: { workspace: Workspace }) {
  const [name, setName] = useState("");
  const [picture, setPicture] = useState("");
  const [draft, setDraft] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    api.memberInfo().then(({ data }) => {
      if (!active) return;
      setName(data?.name ?? "");
      setPicture(data?.picture ?? "");
    }).catch(() => undefined);
    return () => { active = false; };
  }, [workspace.id]);
  const changePhoto = async () => {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "image/*", copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const form = new FormData();
      form.append("file", { uri: asset.uri, name: asset.name, type: asset.mimeType ?? "image/jpeg" } as unknown as Blob);
      const uploaded = await api.uploadFile("PROFILE", form);
      if (!uploaded.data?.url) throw new Error("이미지 업로드 응답이 올바르지 않습니다");
      await api.editMember({ picture: uploaded.data.url });
      setPicture(uploaded.data.url);
      setMessage("프로필 사진을 변경했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "프로필 사진을 변경하지 못했습니다");
    } finally { setBusy(false); }
  };
  const saveName = async () => {
    if (busy || !draft.trim()) return;
    setBusy(true); setMessage("");
    try {
      await api.editMember({ name: draft.trim() });
      setName(draft.trim());
      setEditingName(false);
      setMessage("이름을 변경했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "이름을 변경하지 못했습니다");
    } finally { setBusy(false); }
  };
  return <>
    <Card title="프로필 정보">
      <View style={styles.settingsIdentity}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="프로필 사진 변경" onPress={() => void changePhoto()} disabled={busy}>
          {picture ? <Image source={{ uri: absoluteApiUrl(picture) }} style={styles.settingsAvatar} /> : <View style={styles.settingsAvatarPlaceholder}><Text style={styles.link}>사진 추가</Text></View>}
        </TouchableOpacity>
        <View style={styles.settingsIdentityName}><Text style={styles.profileNameText}>{name || "이름"}</Text><TouchableOpacity accessibilityRole="button" onPress={() => { setDraft(name); setEditingName(true); }} disabled={busy}><Text style={styles.link}>이름 수정</Text></TouchableOpacity></View>
      </View>
      {busy ? <Text style={styles.muted}>변경 사항을 저장하는 중…</Text> : null}
      {message ? <Text style={message.includes("변경") ? styles.answer : styles.error}>{message}</Text> : null}
    </Card>
    <Modal visible={editingName} transparent animationType="fade" onRequestClose={() => setEditingName(false)}><View style={styles.modalBackdrop}><View style={styles.editDialog}><Text style={styles.dialogTitle}>이름 수정</Text><TextInput autoFocus value={draft} onChangeText={setDraft} style={styles.input} placeholder="이름을 입력해 주세요" maxLength={40} /><View style={styles.dialogActions}><TouchableOpacity onPress={() => setEditingName(false)}><Text style={styles.muted}>취소</Text></TouchableOpacity><TouchableOpacity onPress={() => void saveName()} disabled={busy || !draft.trim()}><Text style={styles.link}>{busy ? "저장 중…" : "저장"}</Text></TouchableOpacity></View></View></View></Modal>
  </>;
}

export type WorkspaceSection = "workspaceGeneral" | "workspaceMembers" | "workspaceInvite" | "workspaceNotifications" | "workspaceCreate" | "workspaceJoin";

export function WorkspaceDetailScreen({ workspaces, workspace, onSelect, onNavigate, onReload }: { workspaces: Workspace[]; workspace: Workspace; onSelect: (value: Workspace) => void; onNavigate: (section: WorkspaceSection) => void; onReload: () => Promise<void> }) {
  const [workspacePickerOpen, setWorkspacePickerOpen] = useState(false);
  const [role, setRole] = useState<Role>("STUDENT");
  useEffect(() => {
    let active = true;
    Promise.all([api.memberInfo(), api.myProfile(workspace.id)])
      .then(([member, profile]) => {
        if (!active) return;
        setRole(workspace.ownerId === member.data?.id ? "ADMIN" : profile.data?.role ?? "STUDENT");
      })
      .catch(() => active && setRole("STUDENT"));
    return () => { active = false; };
  }, [workspace.id, workspace.ownerId]);
  const canInvite = Platform.OS === "ios"
    ? role !== "STUDENT"
    : role === "ADMIN" || role === "MIDDLE_ADMIN";

  return <>
    <ScrollView style={styles.content}>
      <View style={styles.workspaceHero}>
        {workspace.image ? <Image source={{ uri: absoluteApiUrl(workspace.image) }} style={styles.workspaceAvatar} /> : <View style={styles.workspaceAvatarPlaceholder}><Text style={styles.link}>{workspace.name.slice(0, 1)}</Text></View>}
        <View style={styles.workspaceHeroText}><Text style={styles.rowTitle}>{workspace.name}</Text><TouchableOpacity accessibilityRole="button" onPress={() => setWorkspacePickerOpen(true)} style={styles.switchButton}><Text style={styles.switchButtonText}>학교 전환</Text></TouchableOpacity></View>
      </View>
      <View style={styles.workspaceDivider} />
      <View style={styles.workspaceSectionHeading}><Text style={styles.workspaceSectionIcon}>⚙</Text></View>
      <WorkspaceNavigationRow title="일반" onPress={() => onNavigate("workspaceGeneral")} />
      <WorkspaceNavigationRow title="알림 설정" onPress={() => onNavigate("workspaceNotifications")} />
      <View style={styles.workspaceSectionHeading}><Text style={styles.workspaceSectionIcon}>♙</Text></View>
      <WorkspaceNavigationRow title="멤버" onPress={() => onNavigate("workspaceMembers")} />
      {canInvite ? <WorkspaceNavigationRow title="멤버 초대" onPress={() => onNavigate("workspaceInvite")} /> : null}
    </ScrollView>
    <Modal visible={workspacePickerOpen} transparent animationType="slide" onRequestClose={() => setWorkspacePickerOpen(false)}>
      <View style={styles.workspacePickerBackdrop}>
        <TouchableOpacity accessibilityRole="button" style={styles.workspacePickerDismiss} activeOpacity={1} onPress={() => setWorkspacePickerOpen(false)} />
        <View style={styles.workspacePicker}>
          <View style={styles.sheetHandle} />
          <Text style={styles.dialogTitle}>가입된 학교</Text>
          <ScrollView style={styles.workspacePickerList}>
            {workspaces.map((item) => <TouchableOpacity key={item.id} style={styles.workspaceOption} onPress={() => { setWorkspacePickerOpen(false); onSelect(item); }}>
              {item.image ? <Image source={{ uri: absoluteApiUrl(item.image) }} style={styles.workspaceOptionAvatar} /> : <View style={styles.workspaceOptionAvatarPlaceholder}><Text style={styles.link}>{item.name.slice(0, 1)}</Text></View>}
              <Text style={item.id === workspace.id ? styles.activeTab : styles.rowTitle}>{item.name}{item.id === workspace.id ? " · 선택됨" : ""}</Text>
              <Text style={styles.muted}>›</Text>
            </TouchableOpacity>)}
            {Platform.OS === "android" ? <PendingWorkspaceRequests onChanged={onReload} /> : null}
          </ScrollView>
          <View style={styles.workspacePickerActions}>
            <Button label="새 학교 만들기" kind="secondary" onPress={() => { setWorkspacePickerOpen(false); onNavigate("workspaceCreate"); }} />
            <Button label="기존 학교 가입" onPress={() => { setWorkspacePickerOpen(false); onNavigate("workspaceJoin"); }} />
          </View>
        </View>
      </View>
    </Modal>
  </>;
}

function WorkspaceNavigationRow({ title, onPress }: { title: string; onPress: () => void }) {
  return <TouchableOpacity accessibilityRole="button" onPress={onPress} style={styles.workspaceNavigationRow}>
    <Text style={styles.workspaceNavigationTitle}>{title}</Text>
    <Text style={styles.workspaceNavigationArrow}>›</Text>
  </TouchableOpacity>;
}

export function WorkspaceGeneralScreen() {
  const leaveWorkspace = () => Alert.alert("탈퇴 실패 안내", "시연 모드에서는 탈퇴가 불가능합니다.");
  return <ScrollView style={styles.content}><TouchableOpacity accessibilityRole="button" onPress={leaveWorkspace} style={styles.generalAction}><Text style={styles.leaveWorkspace}>학교 나가기</Text><Text style={styles.muted}>›</Text></TouchableOpacity></ScrollView>;
}
export function WorkspaceMembersScreen({ workspace }: { workspace: Workspace }) { return <ScrollView style={styles.content}><WorkspaceMembers workspace={workspace} /></ScrollView>; }
export function WorkspaceInviteScreen({ workspace }: { workspace: Workspace }) { return <ScrollView style={styles.content}><WorkspaceInviteCode workspace={workspace} /><JoinRequests workspace={workspace} /></ScrollView>; }
export function WorkspaceNotificationsScreen({ workspace }: { workspace: Workspace }) { return <ScrollView style={styles.content}><WorkspaceNotificationSettings workspace={workspace} /></ScrollView>; }
export function WorkspaceCreateScreen({ onReload }: { onReload: () => Promise<void> }) { return <ScrollView style={styles.content}><CreateWorkspaceCard onCreated={onReload} /></ScrollView>; }
export function WorkspaceJoinScreen({ onReload }: { onReload: () => Promise<void> }) {
  const [step, setStep] = useState<"role" | "code" | "confirm" | "waiting">("role");
  const [inviteCode, setInviteCode] = useState(""); const [joinRole, setJoinRole] = useState<WorkspaceJoinRole>("STUDENT"); const [workspace, setWorkspace] = useState<WorkspaceSearchSummary>(); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (step === "role") return false;
      setStep((current) => current === "confirm" ? "code" : current === "code" ? "role" : "role");
      return true;
    });
    return () => subscription.remove();
  }, [step]);
  const search = async () => { if (inviteCode.trim().length !== 6 || busy) return; setBusy(true); setMessage(""); try { const result = await api.searchWorkspace(inviteCode.trim().toUpperCase()); setWorkspace(result.data); setStep("confirm"); } catch (error) { setMessage(error instanceof Error ? error.message : "학교를 찾지 못했습니다"); } finally { setBusy(false); } };
  const join = async () => { if (!workspace || busy) return; setBusy(true); setMessage(""); try { await api.joinWorkspace({ code: inviteCode.trim().toUpperCase(), role: joinRole }); await onReload(); setStep("waiting"); } catch (error) { setMessage(error instanceof Error ? error.message : "가입 신청에 실패했습니다"); } finally { setBusy(false); } };
  return <ScrollView style={styles.content}>
    {step === "role" ? <Card title="가입 유형 선택"><WorkspaceRolePicker value={joinRole} onChange={setJoinRole} /><Button label="계속하기" onPress={() => setStep("code")} /></Card> : null}
    {step === "code" ? <Card title="초대 코드 입력"><TextInput value={inviteCode} onChangeText={(value) => setInviteCode(value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase())} autoCapitalize="characters" maxLength={6} style={styles.input} placeholder="학교 코드 6자리" /><Button label={busy ? "학교 확인 중…" : "계속하기"} onPress={() => void search()} disabled={busy || inviteCode.length !== 6} /></Card> : null}
    {step === "confirm" && workspace ? <Card title="학교 확인"><View style={styles.schoolSummary}>{workspace.workspaceImageUrl ? <Image source={{ uri: workspace.workspaceImageUrl }} style={styles.schoolImage} /> : null}<Text style={styles.schoolName}>{workspace.workspaceName}</Text><Text style={styles.muted}>학생 {workspace.studentCount}명 · 교사 {workspace.teacherCount}명</Text></View><Button label={busy ? "신청 중…" : "가입 신청"} onPress={() => void join()} disabled={busy} /><Button label="다시 입력" kind="secondary" onPress={() => setStep("code")} disabled={busy} /></Card> : null}
    {step === "waiting" ? <><Card title="가입 승인 대기"><Text style={styles.muted}>관리자의 승인이 완료되면 워크스페이스 목록에 표시됩니다.</Text><Button label="목록 새로고침" kind="secondary" onPress={() => void onReload()} /></Card><PendingWorkspaceRequests onChanged={onReload} /></> : null}
    {message ? <Text style={styles.error}>{message}</Text> : null}
  </ScrollView>;
}

function WorkspaceEditor({ workspace, onSaved }: { workspace: Workspace; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(workspace.name); const [image, setImage] = useState<{ uri: string; name: string; mimeType?: string }>(); const [canEdit, setCanEdit] = useState(false); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState("");
  useEffect(() => { let active = true; Promise.all([api.memberInfo(), api.myProfile(workspace.id)]).then(([member, profile]) => active && setCanEdit(member.data?.id === workspace.ownerId || profile.data?.role === "MIDDLE_ADMIN")).catch(() => undefined); return () => { active = false; }; }, [workspace.id, workspace.ownerId]);
  useEffect(() => { setName(workspace.name); setImage(undefined); }, [workspace.id, workspace.name]);
  const pickImage = async () => { try { const result = await DocumentPicker.getDocumentAsync({ type: "image/*", copyToCacheDirectory: true, multiple: false }); if (!result.canceled && result.assets[0]) { const asset = result.assets[0]; setImage({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? undefined }); } } catch (error) { setNotice(error instanceof Error ? error.message : "학교 이미지를 선택하지 못했습니다"); } };
  const save = async () => { if (busy || !name.trim()) return; setBusy(true); setNotice(""); try { let imageUrl: string | undefined; if (image) { const form = new FormData(); form.append("file", { uri: image.uri, name: image.name, type: image.mimeType ?? "image/jpeg" } as unknown as Blob); const uploaded = await api.uploadFile("IMAGE", form); imageUrl = uploaded.data?.url; if (!imageUrl) throw new Error("이미지 업로드 응답이 올바르지 않습니다"); } await api.updateWorkspace({ workspaceId: workspace.id, name: name.trim(), image: imageUrl }); await onSaved(); setImage(undefined); setNotice("워크스페이스 정보를 저장했습니다."); } catch (error) { setNotice(error instanceof Error ? error.message : "워크스페이스 정보를 저장하지 못했습니다"); } finally { setBusy(false); } };
  if (!canEdit) return null;
  return <Card title="워크스페이스 정보 수정"><TextInput value={name} onChangeText={setName} style={styles.input} placeholder="워크스페이스 이름" maxLength={80} /><TouchableOpacity onPress={() => void pickImage()} disabled={busy} style={{ alignItems: "center", paddingVertical: 8 }}>{image ? <Image source={{ uri: image.uri }} style={{ width: 72, height: 72, borderRadius: 36 }} /> : workspace.image ? <Image source={{ uri: absoluteApiUrl(workspace.image) }} style={{ width: 72, height: 72, borderRadius: 36 }} /> : <Text style={styles.link}>학교 이미지 추가</Text>}<Text style={styles.link}>{image || workspace.image ? "이미지 변경" : "학교 이미지 추가 (선택)"}</Text></TouchableOpacity><Button label={busy ? "저장 중…" : "워크스페이스 저장"} onPress={() => void save()} disabled={busy || !name.trim()} />{notice ? <Text style={notice.includes("저장했습니다") ? styles.answer : styles.error}>{notice}</Text> : null}</Card>;
}

function WorkspaceOrganizationChart({ workspace }: { workspace: Workspace }) {
  const [chart, setChart] = useState<WorkspaceMemberChart>(); const [error, setError] = useState("");
  useEffect(() => { let active = true; api.workspaceMemberChart(workspace.id).then((result) => active && setChart(result.data)).catch((reason) => active && setError(reason instanceof Error ? reason.message : "조직도를 불러오지 못했습니다")); return () => { active = false; }; }, [workspace.id]);
  const sections: Array<[keyof WorkspaceMemberChart, string]> = [["admin", "관리자"], ["middleAdmin", "중간관리자"], ["teachers", "교사"], ["students", "학생"]];
  return <Card title="워크스페이스 조직도">{error ? <Text style={styles.error}>{error}</Text> : !chart ? <Text style={styles.muted}>불러오는 중…</Text> : sections.map(([key, title]) => { const groups = chart[key]; return <View key={key}><Text style={styles.rowTitle}>{title}</Text>{Object.entries(groups).length ? Object.entries(groups).map(([belong, people]) => <View key={`${key}-${belong}`} style={{ paddingLeft: 12 }}><Text style={styles.muted}>{belong}</Text>{people.map((person) => <Text key={person.member.id}>{person.member.name}{person.spot ? ` · ${person.spot}` : ""}{person.status ? ` — ${person.status}` : ""}</Text>)}</View>) : <Text style={styles.muted}>등록된 구성원이 없습니다.</Text>}</View>; })}</Card>;
}

function WorkspaceNotificationSettings({ workspace }: { workspace: Workspace }) { const [enabled, setEnabled] = useState(true); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(""); useEffect(() => { let active = true; api.workspaceNotificationPreference(workspace.id).then((result) => { if (active) setEnabled(result.data ?? true); }).catch((error) => active && setNotice(error instanceof Error ? error.message : "알림 설정을 불러오지 못했습니다")); return () => { active = false; }; }, [workspace.id]); const toggle = async () => { if (busy) return; setBusy(true); setNotice(""); try { const result = await api.setWorkspaceNotificationPreference(workspace.id, !enabled); setEnabled(result.data ?? !enabled); } catch (error) { setNotice(error instanceof Error ? error.message : "알림 설정을 저장하지 못했습니다"); } finally { setBusy(false); } }; return <Card title="워크스페이스 알림"><Text style={styles.muted}>이 워크스페이스의 공지와 채팅 푸시 알림</Text><Button label={busy ? "저장 중…" : enabled ? "알림 켜짐 · 끄기" : "알림 꺼짐 · 켜기"} kind={enabled ? "primary" : "secondary"} onPress={toggle} disabled={busy} />{notice ? <Text style={styles.error}>{notice}</Text> : null}</Card>; }
function WorkspaceInviteCode({ workspace }: { workspace: Workspace }) { const [code, setCode] = useState(""); const [busy, setBusy] = useState(false); const [notice, setNotice] = useState(""); const load = useCallback(async () => { setBusy(true); setNotice(""); try { const result = await api.workspaceCode(workspace.id); setCode(result.data ?? ""); } catch (error) { setNotice(error instanceof Error ? error.message : "초대 코드를 불러오지 못했습니다"); } finally { setBusy(false); } }, [workspace.id]); useEffect(() => { setCode(""); void load(); }, [load]); const share = async () => { if (!code) return; try { await Share.share({ message: `스기 ${workspace.name} 워크스페이스 초대 코드: ${code}` }); } catch (error) { setNotice(error instanceof Error ? error.message : "초대 코드를 공유하지 못했습니다"); } }; return <Card title="구성원 초대"><Text style={styles.muted}>초대 코드를 공유하면 다른 구성원이 가입을 신청할 수 있습니다.</Text>{code ? <><Text selectable style={styles.rowTitle}>{code}</Text><Button label="초대 코드 공유" kind="secondary" onPress={share} /></> : <Button label={busy ? "불러오는 중…" : "초대 코드 보기"} kind="secondary" onPress={() => void load()} disabled={busy} />}{notice ? <Text style={styles.error}>{notice}</Text> : null}</Card>; }

function WorkspaceMembers({ workspace }: { workspace: Workspace }) { const [members, setMembers] = useState<Member[]>([]); const [isOwner, setIsOwner] = useState(false); const [busyId, setBusyId] = useState(""); const [notice, setNotice] = useState(""); const refresh = useCallback(async () => { const [info, result] = await Promise.all([api.memberInfo(), api.workspaceMembers(workspace.id)]); setIsOwner(info.data?.id === workspace.ownerId); setMembers((result.data ?? []).map((member) => ({ ...member, role: member.id === workspace.ownerId ? "ADMIN" : member.role ?? "STUDENT" }))); }, [workspace.id, workspace.ownerId]); useEffect(() => { refresh().catch((error) => setNotice(error instanceof Error ? error.message : "구성원 목록을 불러오지 못했습니다")); }, [refresh]); const roleName = (role?: Role) => role === "ADMIN" ? "관리자" : role === "MIDDLE_ADMIN" ? "중간관리자" : role === "TEACHER" ? "교사" : "학생"; const setRole = async (member: Member, role: Role) => { if (busyId) return; setBusyId(member.id); setNotice(""); try { await api.setWorkspaceMemberRole(workspace.id, member.id, role); await refresh(); } catch (error) { setNotice(error instanceof Error ? error.message : "권한을 변경하지 못했습니다"); } finally { setBusyId(""); } }; const remove = (member: Member) => Alert.alert("구성원 내보내기", `${member.name}님을 워크스페이스에서 내보낼까요?`, [{ text: "취소", style: "cancel" }, { text: "내보내기", style: "destructive", onPress: () => { void (async () => { setBusyId(member.id); setNotice(""); try { await api.removeWorkspaceMember(workspace.id, member.id); await refresh(); } catch (error) { setNotice(error instanceof Error ? error.message : "구성원을 내보내지 못했습니다"); } finally { setBusyId(""); } })(); } }]); return <Card title="워크스페이스 구성원">{members.map((member) => <View key={member.id} style={styles.memberRow}><Text style={styles.rowTitle}>{member.name} · {roleName(member.role)}</Text>{isOwner && member.id !== workspace.ownerId ? <><View style={styles.memberActions}>{(["STUDENT", "TEACHER", "MIDDLE_ADMIN"] as const).map((role) => <TouchableOpacity key={role} disabled={!!busyId} onPress={() => setRole(member, role)}><Text style={member.role === role ? styles.activeTab : styles.link}>{role === "STUDENT" ? "학생" : role === "TEACHER" ? "교사" : "관리자"}</Text></TouchableOpacity>)}</View><TouchableOpacity disabled={!!busyId} onPress={() => remove(member)}><Text style={styles.error}>내보내기</Text></TouchableOpacity></> : null}</View>)}{notice ? <Text style={styles.error}>{notice}</Text> : null}</Card>; }

function ProfileEditor({ workspace, onOpenSettings }: { workspace: Workspace; onOpenSettings: () => void }) {
  const [name, setName] = useState("");
  const [picture, setPicture] = useState("");
  const [status, setStatus] = useState(""); const [nick, setNick] = useState(""); const [spot, setSpot] = useState(""); const [belong, setBelong] = useState(""); const [phone, setPhone] = useState(""); const [wire, setWire] = useState(""); const [location, setLocation] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<"status" | "nick" | "studentNumber" | "spot" | "belong" | "phone" | "wire" | "location">();
  const [draft, setDraft] = useState("");
  useEffect(() => { let active = true; Promise.all([api.memberInfo(), api.myProfile(workspace.id)]).then(([member, profile]) => { if (!active) return; setName(member.data?.name ?? ""); setPicture(member.data?.picture ?? ""); setStatus(profile.data?.status ?? ""); setNick(profile.data?.nick ?? ""); setSpot(profile.data?.spot ?? ""); setBelong(profile.data?.belong ?? ""); setPhone(profile.data?.phone ?? ""); setWire(profile.data?.wire ?? ""); setLocation(profile.data?.location ?? ""); }).catch(() => undefined); return () => { active = false; }; }, [workspace.id]);
  const profileRows: Array<[NonNullable<typeof editing>, string, string, (value: string) => void]> = [
    ["status", "상태메세지", status, setStatus], ["nick", "닉네임", nick, setNick],
    ["spot", "직위", spot, setSpot], ["belong", "소속", belong, setBelong], ["phone", "휴대전화번호", phone, setPhone], ["wire", "유선전화번호", wire, setWire], ["location", "근무 위치", location, setLocation],
  ];
  const openEditor = (key: typeof editing, value: string) => { setEditing(key); setDraft(value); };
  const fieldTitle = profileRows.find(([key]) => key === editing)?.[1] ?? "프로필";
  const commitDraft = async () => {
    if (!editing || busy) return;
    const selectedRow = profileRows.find(([key]) => key === editing);
    if (!selectedRow) return;
    setBusy(true); setNotice("");
    try {
      await api.editProfile(workspace.id, { [editing]: draft });
      selectedRow[3](draft);
      setEditing(undefined);
      setNotice(`${selectedRow[1]} 수정 성공`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : `${selectedRow[1]} 수정에 실패했습니다`);
    } finally { setBusy(false); }
  };
  return <Card title="내 프로필">
    <View style={styles.profileHeader}>{picture ? <Image source={{ uri: absoluteApiUrl(picture) }} style={styles.profilePicture} /> : <View style={styles.profilePictureEmpty}><Text style={styles.link}>프로필</Text></View>}<View style={styles.profileName}><Text style={styles.profileNameText}>{name || "이름"}{nick ? ` (${nick})` : ""}</Text></View><TouchableOpacity accessibilityRole="button" accessibilityLabel="설정" onPress={onOpenSettings} style={styles.settingsButton}><Text style={styles.settingsIcon}>⚙</Text></TouchableOpacity></View>
    {profileRows.map(([key, title, value]) => <TouchableOpacity key={key} accessibilityRole="button" style={styles.profileRow} onPress={() => openEditor(key as NonNullable<typeof editing>, value)}><View><Text style={styles.profileLabel}>{title}</Text><Text style={styles.profileValue}>{value || "미설정"}</Text></View><Text style={styles.profileEdit}>✎</Text></TouchableOpacity>)}
    {notice ? <Text style={notice.endsWith("수정 성공") ? styles.answer : styles.error}>{notice}</Text> : null}
    <Modal visible={!!editing} transparent animationType="fade" onRequestClose={() => { if (!busy) setEditing(undefined); }}><View style={styles.modalBackdrop}><View style={styles.editDialog}><Text style={styles.dialogTitle}>{fieldTitle} 수정</Text><TextInput autoFocus value={draft} onChangeText={setDraft} style={styles.input} placeholder={`${fieldTitle} 입력`} multiline={editing === "status"} keyboardType={editing === "phone" || editing === "wire" ? "phone-pad" : "default"} editable={!busy} maxLength={editing === "status" ? 160 : editing === "nick" ? 40 : editing === "spot" ? 80 : editing === "belong" || editing === "location" ? 120 : 40} /><View style={styles.dialogActions}><TouchableOpacity disabled={busy} onPress={() => setEditing(undefined)}><Text style={styles.muted}>취소</Text></TouchableOpacity><TouchableOpacity disabled={busy} onPress={() => void commitDraft()}><Text style={styles.link}>{busy ? "저장 중…" : "저장"}</Text></TouchableOpacity></View></View></View></Modal>
  </Card>;
}

function JoinRequests({ workspace }: { workspace: Workspace }) { type RequestRole = "STUDENT" | "TEACHER" | "MIDDLE_ADMIN"; const [role, setRole] = useState<Role>(); const [requestRole, setRequestRole] = useState<RequestRole>("STUDENT"); const [members, setMembers] = useState<Member[]>([]); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); useEffect(() => { let active = true; Promise.all([api.memberInfo(), api.myProfile(workspace.id)]).then(([member, profile]) => { if (active) setRole(workspace.ownerId === member.data?.id ? "ADMIN" : profile.data?.role ?? "STUDENT"); }).catch(() => active && setRole("STUDENT")); return () => { active = false; }; }, [workspace.id, workspace.ownerId]); const options: RequestRole[] = role === "ADMIN" ? ["STUDENT", "TEACHER", "MIDDLE_ADMIN"] : role === "MIDDLE_ADMIN" ? ["STUDENT", "TEACHER"] : role === "TEACHER" ? ["STUDENT"] : []; useEffect(() => { if (!options.includes(requestRole)) { setRequestRole("STUDENT"); setMembers([]); return; } let active = true; api.waitlist(workspace.id, requestRole).then((result) => active && setMembers(result.data ?? [])).catch(() => active && setMembers([])); return () => { active = false; }; }, [workspace.id, requestRole, role]); const update = async (memberId: string, approve: boolean) => { setBusy(true); setMessage(""); try { if (approve) await api.approveWorkspaceMember(workspace.id, memberId, requestRole); else await api.rejectWorkspaceMember(workspace.id, memberId, requestRole); setMembers((current) => current.filter((member) => member.id !== memberId)); } catch (e) { setMessage(e instanceof Error ? e.message : "요청 처리에 실패했습니다"); } finally { setBusy(false); } }; if (!role || options.length === 0) return null; return <Card title="가입 신청 관리"><View style={styles.row}>{options.map((option) => <TouchableOpacity key={option} onPress={() => setRequestRole(option)}><Text style={requestRole === option ? styles.activeTab : styles.inactiveTab}>{option === "STUDENT" ? "학생" : option === "TEACHER" ? "교사" : "관리자"}</Text></TouchableOpacity>)}</View>{members.length ? members.map((member) => <View key={member.id} style={styles.row}><Text style={styles.rowTitle}>{member.name} · {member.email}</Text><View><Button label="승인" onPress={() => update(member.id, true)} disabled={busy} /><Button label="거절" kind="secondary" onPress={() => update(member.id, false)} disabled={busy} /></View></View>) : <Text style={styles.muted}>대기 중인 가입 신청이 없습니다.</Text>}{message ? <Text style={styles.error}>{message}</Text> : null}</Card>; }

const styles = StyleSheet.create({
  content: { flex: 1, padding: 16 },
  activeTab: { color: SeugiColor.Primary500, fontWeight: "700" },
  inactiveTab: { color: SeugiColor.Gray500 },
  rowTitle: { fontWeight: "600" },
  input: { backgroundColor: SeugiColor.White, borderWidth: 1, borderColor: SeugiColor.Gray300, borderRadius: 10, padding: 13, marginBottom: 10 },
  answer: { backgroundColor: SeugiColor.Primary100, padding: 10, borderRadius: 8 },
  link: { color: SeugiColor.Primary500 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
  memberRow: { borderBottomWidth: 1, borderColor: SeugiColor.Gray100, paddingVertical: 12, gap: 8 },
  generalAction: { minHeight: 56, paddingHorizontal: 4, borderBottomWidth: 1, borderColor: SeugiColor.Gray100, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  leaveWorkspace: { color: SeugiColor.Red500, fontSize: 15, fontWeight: "600" },
  memberActions: { flexDirection: "row", gap: 14 },
  row: { backgroundColor: SeugiColor.White, padding: 16, marginBottom: 8, borderRadius: 12, flexDirection: "row", justifyContent: "space-between" },
  numberInput: { flex: 1, minWidth: 0 },
  schoolSummary: { alignItems: "center", gap: 8, paddingVertical: 12 },
  schoolImage: { width: 76, height: 76, borderRadius: 38 },
  schoolName: { color: SeugiColor.Gray800, fontSize: 20, fontWeight: "700" },
  workspaceHero: { minHeight: 84, paddingHorizontal: 4, paddingBottom: 18, flexDirection: "row", alignItems: "center", gap: 14 },
  workspaceHeroText: { flex: 1, gap: 8 },
  workspaceAvatar: { width: 48, height: 48, borderRadius: 24 },
  workspaceAvatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: SeugiColor.Primary100, alignItems: "center", justifyContent: "center" },
  switchButton: { alignSelf: "flex-start", backgroundColor: SeugiColor.Gray100, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  switchButtonText: { color: SeugiColor.Gray600, fontSize: 13 },
  workspaceDivider: { height: 8, backgroundColor: SeugiColor.Gray100, marginHorizontal: -16 },
  workspaceSectionHeading: { height: 42, justifyContent: "center", paddingHorizontal: 4 },
  workspaceSectionIcon: { fontSize: 22, color: SeugiColor.Gray800 },
  workspaceNavigationRow: { minHeight: 56, paddingHorizontal: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: SeugiColor.Gray100 },
  workspaceNavigationTitle: { color: SeugiColor.Gray800, fontSize: 15, fontWeight: "600" },
  workspaceNavigationArrow: { color: SeugiColor.Gray400, fontSize: 26, lineHeight: 30 },
  workspacePickerBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.32)" },
  workspacePickerDismiss: { flex: 1 },
  workspacePicker: { maxHeight: "75%", backgroundColor: SeugiColor.White, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: SeugiColor.Gray300, alignSelf: "center", marginBottom: 16 },
  workspacePickerList: { marginTop: 12 },
  workspaceOption: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: SeugiColor.Gray100 },
  workspaceOptionAvatar: { width: 36, height: 36, borderRadius: 18 },
  workspaceOptionAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: SeugiColor.Primary100, alignItems: "center", justifyContent: "center" },
  workspacePickerActions: { flexDirection: "row", gap: 8, paddingTop: 12 },
  profileHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, marginBottom: 8 },
  settingsIdentity: { minHeight: 104, flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 8 },
  settingsIdentityName: { flex: 1, gap: 8 },
  settingsAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: SeugiColor.Gray300 },
  settingsAvatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: SeugiColor.Primary100, alignItems: "center", justifyContent: "center" },
  profilePicture: { width: 56, height: 56, borderRadius: 28, backgroundColor: SeugiColor.Gray300 },
  profilePictureEmpty: { width: 56, height: 56, borderRadius: 28, backgroundColor: SeugiColor.Primary100, alignItems: "center", justifyContent: "center" },
  profileName: { flex: 1, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  profileNameText: { color: SeugiColor.Gray800, fontSize: 16, fontWeight: "600" },
  settingsButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  settingsIcon: { color: SeugiColor.Gray500, fontSize: 24 },
  profileRow: { minHeight: 64, borderTopWidth: 1, borderColor: SeugiColor.Gray100, paddingHorizontal: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  profileLabel: { color: SeugiColor.Gray500, fontSize: 14 },
  profileValue: { color: SeugiColor.Gray800, fontSize: 15, marginTop: 5 },
  profileEdit: { color: SeugiColor.Gray500, fontSize: 19, paddingHorizontal: 8 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", padding: 24 },
  editDialog: { width: "100%", backgroundColor: SeugiColor.White, borderRadius: 14, padding: 20, gap: 12 },
  dialogTitle: { color: SeugiColor.Gray800, fontSize: 17, fontWeight: "700" },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 24, paddingTop: 4 },
});
