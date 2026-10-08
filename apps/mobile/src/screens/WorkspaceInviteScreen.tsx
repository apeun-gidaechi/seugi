import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Alert, Modal, Platform, ScrollView, StyleSheet, Text, ToastAndroid, TouchableOpacity, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { SeugiColor } from "@seugi/design-tokens";
import type { Member, Role, Workspace } from "@seugi/contracts";
import { Button } from "../components/ui";
import { SeugiSegmentedControl } from "../design-system/SegmentedControl";
import { SeugiAvatar } from "../design-system/Avatar";
import { SeugiCheckbox } from "../design-system/Checkbox";
import { api } from "../services/api";
import { absoluteApiUrl } from "../utils/url";
import { clearProcessedWaitlistSelection, toggleWaitlistSelection, waitlistSelectionBatch, waitlistSelectionCount, type WaitlistRole } from "../utils/waitlistSelection";
import { workspaceInviteFeedback } from "../utils/workspaceInviteFeedback";
import { workspaceInviteConfirmationTitle, workspaceInviteNeedsConfirmation } from "../utils/workspaceInviteConfirmation";

export function WorkspaceInviteScreen({ workspace }: { workspace: Workspace }) {
  const [requestActions, setRequestActions] = useState<ReactNode>();
  return (
    <View style={styles.screen}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <WorkspaceInviteCode workspace={workspace} />
        <JoinRequests workspace={workspace} onActionsChange={setRequestActions} />
      </ScrollView>
      {requestActions ? <View style={styles.fixedFooter}>{requestActions}</View> : null}
    </View>
  );
}

function WorkspaceInviteCode({ workspace }: { workspace: Workspace }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    setNotice("");
    try {
      const result = await api.workspaceCode(workspace.id);
      setCode(result.data ?? "");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "초대 코드를 불러오지 못했습니다");
    } finally {
      setBusy(false);
    }
  }, [workspace.id]);

  useEffect(() => {
    setCode("");
    void load();
  }, [load]);

  const showCode = () => {
    if (!code) return;
    if (Platform.OS === "ios") Alert.alert(`초대코드는 ${code}입니다`);
    else setShowCodeDialog(true);
  };

  return (
    <View style={styles.inviteCodeSection}>
      <Text style={styles.sectionTitle}>학교코드로 멤버를 초대할 수 있어요</Text>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={showCode}
        disabled={busy || !code}
        style={styles.codeButton}
      >
        <Text style={styles.codeButtonText}>{Platform.OS === "ios" ? "학교코드 확인" : "학생코드 확인"}</Text>
      </TouchableOpacity>
      {busy ? <Text style={styles.muted}>학교 코드를 불러오는 중…</Text> : null}
      {notice ? <Text style={styles.error}>{notice}</Text> : null}
      {Platform.OS === "android" ? (
        <Modal visible={showCodeDialog} transparent animationType="fade" onRequestClose={() => setShowCodeDialog(false)}>
          <View style={styles.dialogBackdrop}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="닫기" style={styles.dialogDismiss} onPress={() => setShowCodeDialog(false)} />
            <View style={styles.codeDialog}>
              <Text style={styles.dialogTitle}>초대코드는 {code} 입니다</Text>
              <View style={styles.dialogActions}>
                <TouchableOpacity accessibilityRole="button" onPress={() => setShowCodeDialog(false)} style={styles.dialogCancel}>
                  <Text style={styles.dialogCancelText}>닫기</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" onPress={() => { void Clipboard.setStringAsync(code).then(() => setShowCodeDialog(false)); }} style={styles.dialogCopy}>
                  <Text style={styles.dialogCopyText}>복사</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function JoinRequests({ workspace, onActionsChange }: { workspace: Workspace; onActionsChange: (actions: ReactNode) => void }) {
  type RequestRole = WaitlistRole;
  const [role, setRole] = useState<Role>();
  const [requestRole, setRequestRole] = useState<RequestRole>("STUDENT");
  const [members, setMembers] = useState<Record<RequestRole, Member[]>>({ STUDENT: [], TEACHER: [] });
  const [selectedIds, setSelectedIds] = useState<Record<RequestRole, string[]>>({ STUDENT: [], TEACHER: [] });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([api.memberInfo(), api.myProfile(workspace.id)])
      .then(([member, profile]) => {
        if (active) setRole(workspace.ownerId === member.data?.id ? "ADMIN" : profile.data?.role ?? "STUDENT");
      })
      .catch(() => active && setRole("STUDENT"));
    return () => { active = false; };
  }, [workspace.id, workspace.ownerId]);

  const options: RequestRole[] = role === "ADMIN"
    ? ["TEACHER", "STUDENT"]
    : role === "MIDDLE_ADMIN"
      ? ["TEACHER", "STUDENT"]
      : role === "TEACHER" ? ["STUDENT"] : [];

  useEffect(() => {
    if (!options.includes(requestRole)) setRequestRole(options[0] ?? "STUDENT");
    if (!options.length) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setMessage("");
    Promise.all(options.map(async (value) => [value, await api.waitlist(workspace.id, value)] as const))
      .then((results) => {
        if (!active) return;
        setMembers((current) => ({
          ...current,
          ...Object.fromEntries(results.map(([value, result]) => [value, result.data ?? []])),
        }));
      })
      .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "가입 신청을 불러오지 못했습니다"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspace.id, role]);

  const selectedCount = waitlistSelectionCount(options, selectedIds);

  useEffect(() => {
    if (!options.length) {
      onActionsChange(null);
      return;
    }
    onActionsChange(
      <View style={styles.requestActions}>
        <Button label="거절" kind={Platform.OS === "ios" ? "danger" : "secondary"} onPress={() => processSelection(false)} disabled={busy || selectedCount === 0} loading={busy} size={Platform.OS === "ios" ? "large" : "medium"} style={styles.rejectAction} />
        <Button label={`${selectedCount}명 수락`} onPress={() => processSelection(true)} disabled={busy || selectedCount === 0} loading={busy} size={Platform.OS === "ios" ? "large" : "medium"} style={styles.approveAction} />
      </View>,
    );
  }, [busy, onActionsChange, options.length, selectedCount]);

  const submitSelection = async (approve: boolean) => {
    const batch = waitlistSelectionBatch(options, selectedIds);
    setBusy(true);
    setMessage("");
    try {
      const results = await Promise.allSettled(batch.map(([value, ids]) => approve
        ? api.approveWorkspaceMembers(workspace.id, ids, value)
        : api.rejectWorkspaceMembers(workspace.id, ids, value)));
      const succeeded = batch.filter((_, index) => results[index]?.status === "fulfilled");
      const failed = batch.filter((_, index) => results[index]?.status === "rejected");
      const removedByRole: Partial<Record<RequestRole, string[]>> = Object.fromEntries(succeeded);
      setMembers((current) => ({
        STUDENT: current.STUDENT.filter((member) => !removedByRole.STUDENT?.includes(member.id)),
        TEACHER: current.TEACHER.filter((member) => !removedByRole.TEACHER?.includes(member.id)),
      }));
      setSelectedIds((current) => clearProcessedWaitlistSelection(current, removedByRole));
      if (failed.length) {
        const failedResult = results.find((result) => result.status === "rejected");
        throw failedResult?.status === "rejected" ? failedResult.reason : new Error("가입 신청을 처리하지 못했습니다");
      }
      const feedback = workspaceInviteFeedback(Platform.OS === "ios" ? "ios" : "android", approve ? "approve" : "reject", "success");
      if (feedback.kind === "alert") Alert.alert(feedback.title, undefined, [{ text: "확인" }]);
      else ToastAndroid.show(feedback.message, ToastAndroid.SHORT);
    } catch {
      const feedback = workspaceInviteFeedback(Platform.OS === "ios" ? "ios" : "android", approve ? "approve" : "reject", "failure");
      if (feedback.kind === "alert") Alert.alert(feedback.title, feedback.message, [{ text: "확인" }]);
      else ToastAndroid.show(feedback.message, ToastAndroid.SHORT);
    } finally {
      setBusy(false);
    }
  };

  const processSelection = (approve: boolean) => {
    if (!selectedCount || busy) return;
    if (!workspaceInviteNeedsConfirmation(Platform.OS === "ios" ? "ios" : "android")) {
      void submitSelection(approve);
      return;
    }
    const action = approve ? "approve" : "reject";
    Alert.alert(workspaceInviteConfirmationTitle(action), undefined, [
      { text: "취소", style: "cancel" },
      { text: approve ? "수락" : "거절", style: approve ? "default" : "destructive", onPress: () => { void submitSelection(approve); } },
    ]);
  };

  if (!role || options.length === 0) return null;
  const requestCount = Platform.OS === "ios"
    ? members[requestRole].length
    : options.reduce((count, value) => count + members[value].length, 0);
  return (
    <View style={styles.joinRequestsSection}>
      <Text style={styles.sectionTitle}>{requestCount}명으로부터 가입 요청이 왔어요</Text>
      <SeugiSegmentedControl
        value={requestRole}
        options={options.map((value) => ({ value, label: value === "STUDENT" ? "학생" : value === "TEACHER" ? "선생님" : "관리자" }))}
        onChange={(value) => { if (!busy) setRequestRole(value); }}
        variant="nativeTabs"
      />
      {loading ? <Text style={styles.muted}>가입 신청을 불러오는 중…</Text> : members[requestRole].length ? members[requestRole].map((member) => {
        const checked = selectedIds[requestRole].includes(member.id);
        return (
          <TouchableOpacity
            key={member.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked, disabled: busy }}
            onPress={() => setSelectedIds((current) => toggleWaitlistSelection(current, requestRole, member.id))}
            disabled={busy}
            style={styles.requestMemberRow}
          >
            <SeugiAvatar uri={member.picture ? absoluteApiUrl(member.picture) : undefined} name={member.name} imageStyle={styles.requestAvatar} fallbackStyle={styles.requestAvatarFallback} labelStyle={styles.muted} />
            <View style={styles.requestMemberInfo}>
              <Text style={styles.rowTitle}>{member.name}</Text>
              {member.email ? <Text numberOfLines={1} style={styles.muted}>{member.email}</Text> : null}
            </View>
            <SeugiCheckbox checked={checked} enabled={!busy} />
          </TouchableOpacity>
        );
      }) : <Text style={styles.muted}>대기 중인 가입 신청이 없습니다.</Text>}
      {message ? <Text style={message.includes("했습니다") ? styles.answer : styles.error}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SeugiColor.White },
  content: { flex: 1 },
  contentContainer: { paddingBottom: 220 },
  inviteCodeSection: { paddingTop: 6, paddingHorizontal: 20 },
  sectionTitle: { color: SeugiColor.Black, fontSize: 16, fontWeight: "600", marginLeft: 4 },
  codeButton: { alignSelf: "flex-start", marginTop: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: SeugiColor.Gray100, borderRadius: 12 },
  codeButtonText: { color: SeugiColor.Gray600, fontSize: 14 },
  joinRequestsSection: { marginTop: 24, paddingHorizontal: 20 },
  rowTitle: { color: SeugiColor.Gray800, fontWeight: "600" },
  dialogBackdrop: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 28, backgroundColor: "rgba(0,0,0,0.32)" },
  dialogDismiss: { ...StyleSheet.absoluteFillObject },
  codeDialog: { width: "100%", padding: 18, borderRadius: 16, backgroundColor: SeugiColor.White, elevation: 8 },
  dialogTitle: { paddingHorizontal: 4, paddingVertical: 4, color: SeugiColor.Black, fontSize: 18, fontWeight: "700" },
  dialogActions: { flexDirection: "row", gap: 8, marginTop: 18 },
  dialogCancel: { flex: 1, height: 54, justifyContent: "center", alignItems: "center", backgroundColor: SeugiColor.Gray100, borderRadius: 12 },
  dialogCancelText: { color: SeugiColor.Gray600, fontSize: 14, fontWeight: "600" },
  dialogCopy: { flex: 1, height: 54, justifyContent: "center", alignItems: "center", backgroundColor: SeugiColor.Primary500, borderRadius: 12 },
  dialogCopyText: { color: SeugiColor.White, fontSize: 14, fontWeight: "600" },
  answer: { backgroundColor: SeugiColor.Primary100, padding: 10, borderRadius: 8 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
  requestMemberRow: { minHeight: 68, marginHorizontal: -16, paddingHorizontal: 4, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderColor: SeugiColor.Gray100 },
  requestAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: SeugiColor.Gray100 },
  requestAvatarFallback: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: SeugiColor.Gray100 },
  requestMemberInfo: { flex: 1, minWidth: 0, gap: 3 },
  requestActions: { flexDirection: "row", gap: 8, paddingTop: 12, alignItems: "center" },
  fixedFooter: { backgroundColor: SeugiColor.White, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  rejectAction: { flex: 1, marginBottom: 0 },
  approveAction: { flex: 2, marginBottom: 0 },
});
