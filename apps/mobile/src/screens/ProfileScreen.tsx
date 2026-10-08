import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { Workspace } from "@seugi/contracts";
import { Button } from "../components/ui";
import { SeugiTextField } from "../design-system/TextField";
import { SeugiAvatar } from "../design-system/Avatar";
import { SeugiDivider } from "../design-system/Divider";
import { SeugiProfileEditIcon, SeugiProfileSettingsIcon } from "../design-system/ProfileIcons";
import { api } from "../services/api";
import { profileFieldFeedback } from "../utils/profileFieldFeedback";
import { authPrimaryButtonProps } from "../utils/authButton";
import { absoluteApiUrl } from "../utils/url";
import { nativePlatform } from "../utils/platform";

export function ProfileScreen({
  workspace,
  onOpenSettings,
  refreshToken = 0,
}: {
  workspace: Workspace;
  onOpenSettings: () => void;
  refreshToken?: number;
}) {
  return (
    <ScrollView style={styles.content}>
      <ProfileEditor
        workspace={workspace}
        onOpenSettings={onOpenSettings}
        refreshToken={refreshToken}
      />
    </ScrollView>
  );
}

function ProfileEditor({
  workspace,
  onOpenSettings,
  refreshToken,
}: {
  workspace: Workspace;
  onOpenSettings: () => void;
  refreshToken: number;
}) {
  const [name, setName] = useState("");
  const [picture, setPicture] = useState("");
  const [status, setStatus] = useState("");
  const [nick, setNick] = useState("");
  const [spot, setSpot] = useState("");
  const [belong, setBelong] = useState("");
  const [phone, setPhone] = useState("");
  const [wire, setWire] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<
    "status" | "nick" | "studentNumber" | "spot" | "belong" | "phone" | "wire" | "location"
  >();
  const [draft, setDraft] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([api.memberInfo(), api.myProfile(workspace.id)])
      .then(([member, profile]) => {
        if (!active) return;
        setName(member.data?.name ?? "");
        setPicture(member.data?.picture ?? "");
        setStatus(profile.data?.status ?? "");
        setNick(profile.data?.nick ?? "");
        setSpot(profile.data?.spot ?? "");
        setBelong(profile.data?.belong ?? "");
        setPhone(profile.data?.phone ?? "");
        setWire(profile.data?.wire ?? "");
        setLocation(profile.data?.location ?? "");
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [workspace.id, refreshToken]);
  const locationLabel = Platform.OS === "ios" ? "근무위치" : "근무 위치";
  const profileRows: Array<[NonNullable<typeof editing>, string, string, (value: string) => void]> =
    [
      ["status", "상태메세지", status, setStatus],
      ["nick", "닉네임", nick, setNick],
      ["spot", "직위", spot, setSpot],
      ["belong", "소속", belong, setBelong],
      ["phone", "휴대전화번호", phone, setPhone],
      ["wire", "유선전화번호", wire, setWire],
      ["location", locationLabel, location, setLocation],
    ];
  const openEditor = (key: typeof editing, value: string) => {
    setEditing(key);
    setDraft(value);
  };
  const fieldTitle = profileRows.find(([key]) => key === editing)?.[1] ?? "프로필";
  const commitDraft = async () => {
    if (!editing || busy) return;
    const selectedRow = profileRows.find(([key]) => key === editing);
    if (!selectedRow) return;
    const [key, label, , updateValue] = selectedRow;
    const value = draft;
    setEditing(undefined);
    setDraft("");
    if (Platform.OS === "android") updateValue(value);
    setBusy(true);
    try {
      await api.editProfile(workspace.id, { [key]: value });
      if (Platform.OS === "ios") updateValue(value);
      const feedback = profileFieldFeedback(nativePlatform(), label, true, undefined);
      if (feedback.kind === "alert") Alert.alert(feedback.title);
    } catch (error) {
      const feedback = profileFieldFeedback(nativePlatform(), label, false, error);
      if (feedback.kind === "alert") Alert.alert(feedback.title, undefined, [{ text: "확인" }]);
      else if (feedback.kind === "toast" && feedback.message)
        ToastAndroid.show(feedback.message, ToastAndroid.SHORT);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.profileContent}>
      <View style={styles.profileHeader}>
        <SeugiAvatar
          uri={picture ? absoluteApiUrl(picture) : undefined}
          name={name}
          imageStyle={styles.profilePicture}
          fallbackStyle={styles.profilePictureEmpty}
        />
        <View style={styles.profileName}>
          <Text style={styles.profileNameText}>
            {name || "이름"}
            {nick ? ` (${nick})` : ""}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="설정"
          onPress={onOpenSettings}
          style={styles.settingsButton}
        >
          <SeugiProfileSettingsIcon />
        </TouchableOpacity>
      </View>
      <SeugiDivider thickness={8} color={SeugiColor.Gray100} />
      {profileRows.map(([key, title, value]) => (
        <TouchableOpacity
          key={key}
          accessibilityRole="button"
          style={styles.profileRow}
          onPress={() => openEditor(key as NonNullable<typeof editing>, value)}
        >
          <View style={styles.profileRowTitle}>
            <Text style={styles.profileLabel}>{title}</Text>
            <SeugiProfileEditIcon />
          </View>
          <Text style={styles.profileValue}>{value || (Platform.OS === "ios" ? "-" : "")}</Text>
          <SeugiDivider style={styles.profileRowDivider} />
        </TouchableOpacity>
      ))}
      <Modal
        visible={!!editing}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!busy) setEditing(undefined);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.editDialog}>
            <Text style={styles.dialogTitle}>{fieldTitle} 수정</Text>
            <SeugiTextField
              autoFocus
              value={draft}
              onChangeText={setDraft}
              clearable
              containerStyle={styles.inputSpacing}
              placeholder={
                Platform.OS === "ios"
                  ? undefined
                  : `${fieldTitle}${editing === "belong" || editing === "nick" ? "을" : "를"} 입력해주세요`
              }
              keyboardType={
                Platform.OS === "ios" && (editing === "phone" || editing === "wire")
                  ? "number-pad"
                  : "default"
              }
              editable={!busy}
              maxLength={
                Platform.OS === "ios" && (editing === "phone" || editing === "wire")
                  ? 11
                  : undefined
              }
            />
            <Button
              label="저장"
              onPress={() => void commitDraft()}
              disabled={busy}
              loading={busy}
              {...authPrimaryButtonProps(nativePlatform())}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, backgroundColor: SeugiColor.White },
  profileContent: { flex: 1, backgroundColor: SeugiColor.White },
  inputSpacing: { marginBottom: 10 },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  profilePicture: { width: 32, height: 32, borderRadius: 16, backgroundColor: SeugiColor.Gray300 },
  profilePictureEmpty: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SeugiColor.Primary100,
    alignItems: "center",
    justifyContent: "center",
  },
  profileName: { flex: 1, gap: 4 },
  profileNameText: { color: SeugiColor.Gray800, fontSize: 16, fontWeight: "600" },
  settingsButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  profileRow: { minHeight: 72, paddingTop: 8 },
  profileRowTitle: {
    minHeight: 24,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileLabel: { color: SeugiColor.Gray500, fontSize: 14 },
  profileValue: {
    color: SeugiColor.Gray800,
    fontSize: 15,
    minHeight: 40,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  profileEdit: { color: SeugiColor.Gray500, fontSize: 18, width: 20, textAlign: "center" },
  profileRowDivider: { marginHorizontal: 24 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  editDialog: {
    width: "100%",
    minHeight: 220,
    backgroundColor: SeugiColor.White,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 12,
  },
  dialogTitle: { color: SeugiColor.Gray800, fontSize: 17, fontWeight: "700" },
});
