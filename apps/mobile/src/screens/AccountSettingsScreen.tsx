import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { SeugiColor } from "@seugi/design-tokens";
import type { Workspace } from "@seugi/contracts";
import { Button } from "../components/ui";
import { SeugiTextField } from "../design-system/TextField";
import { SeugiAvatar } from "../design-system/Avatar";
import { SeugiDivider } from "../design-system/Divider";
import { SeugiLoadingIndicator } from "../design-system/LoadingIndicator";
import { api } from "../services/api";
import { authPrimaryButtonProps } from "../utils/authButton";
import { absoluteApiUrl } from "../utils/url";
import { profileEditFeedback, withdrawFailureFeedback } from "../utils/accountSettingsFeedback";
import { pickImageFromLibrary } from "@seugi/media-picker";
import { nativePlatform } from "../utils/platform";

export function AccountSettingsScreen({
  workspace,
  onLogout,
  onProfileUpdated,
}: {
  workspace?: Workspace;
  onLogout: () => void | Promise<void>;
  onProfileUpdated?: () => void;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const performSignOut = async () => {
    await api.logout().catch(() => undefined);
    await onLogout();
  };
  const signOut = () => {
    if (Platform.OS === "ios") {
      Alert.alert("로그아웃 하시겠습니까?", undefined, [
        { text: "아니요", style: "cancel" },
        {
          text: "로그아웃",
          onPress: () => {
            void performSignOut();
          },
        },
      ]);
      return;
    }
    void performSignOut();
  };
  const openPolicy = (url: string) => {
    void Linking.openURL(url).catch(() =>
      setMessage("정책 페이지를 열지 못했습니다. 잠시 후 다시 시도해 주세요."),
    );
  };
  const performWithdraw = async () => {
    setBusy(true);
    setMessage("");
    try {
      await api.removeMember();
      await onLogout();
    } catch {
      const feedback = withdrawFailureFeedback(nativePlatform());
      if (feedback.kind === "alert")
        Alert.alert(feedback.title, feedback.message, [{ text: "확인" }]);
      else ToastAndroid.show(feedback.message, ToastAndroid.LONG);
    } finally {
      setBusy(false);
    }
  };
  const withdraw = () => {
    if (Platform.OS !== "ios") {
      void performWithdraw();
      return;
    }
    Alert.alert("정말 회원 탈퇴하시겠습니까?", "회원 탈퇴 시 모든 정보가 삭제 됩니다", [
      { text: "취소", style: "cancel" },
      {
        text: "탈퇴",
        style: "destructive",
        onPress: () => {
          void performWithdraw();
        },
      },
    ]);
  };

  return (
    <View style={styles.content}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <ProfileIdentitySettings workspace={workspace} onProfileUpdated={onProfileUpdated} />
        <SettingsRow title="로그아웃" onPress={signOut} disabled={busy} />
        <SettingsRow title="회원 탈퇴" onPress={withdraw} disabled={busy} destructive />
        <SeugiDivider thickness={8} color={SeugiColor.Gray100} />
        <SettingsRow
          title="개인정보 처리 방침"
          onPress={() =>
            openPolicy("https://byungjjun.notion.site/58f95c1209fb48b4b74434701290f838?pvs=74")
          }
        />
        <SettingsRow
          title="서비스 운영 정책"
          onPress={() =>
            openPolicy("https://byungjjun.notion.site/5ba79e224f53439bbfa3607e581fe6bf?pvs=74")
          }
        />
        {message ? <Text style={styles.error}>{message}</Text> : null}
      </ScrollView>
      {Platform.OS === "android" && busy ? (
        <View style={styles.loadingOverlay}>
          <SeugiLoadingIndicator />
        </View>
      ) : null}
    </View>
  );
}

function SettingsRow({
  title,
  onPress,
  disabled,
  destructive = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={styles.settingsRow}
    >
      <Text style={[styles.settingsRowTitle, destructive && styles.destructive]}>{title}</Text>
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Path
          d="m9 5 7 7-7 7"
          fill="none"
          stroke={SeugiColor.Gray400}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </TouchableOpacity>
  );
}

function ProfileIdentitySettings({
  workspace,
  onProfileUpdated,
}: {
  workspace?: Workspace;
  onProfileUpdated?: () => void;
}) {
  const [name, setName] = useState("");
  const [nick, setNick] = useState("");
  const [picture, setPicture] = useState("");
  const [draft, setDraft] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const reportProfileEdit = (succeeded: boolean) => {
    const feedback = profileEditFeedback(nativePlatform(), succeeded);
    if (feedback.kind === "alert")
      Alert.alert(feedback.title, feedback.message, [{ text: "확인" }]);
    else if (feedback.kind === "toast") ToastAndroid.show(feedback.message, ToastAndroid.SHORT);
  };
  useEffect(() => {
    let active = true;
    Promise.all([
      api.memberInfo(),
      workspace ? api.myProfile(workspace.id) : Promise.resolve(undefined),
    ])
      .then(([{ data }, profile]) => {
        if (!active) return;
        setName(data?.name ?? "");
        setPicture(data?.picture ?? "");
        setNick(profile?.data?.nick ?? "");
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [workspace?.id]);

  const changePhoto = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const asset = await pickImageFromLibrary();
      if (!asset) return;
      const form = new FormData();
      form.append("file", {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? "image/jpeg",
      } as unknown as Blob);
      const uploaded = await api.uploadFile("PROFILE", form);
      if (!uploaded.data?.url) throw new Error("이미지 업로드 응답이 올바르지 않습니다");
      await api.editMember({ picture: uploaded.data.url });
      setPicture(uploaded.data.url);
      reportProfileEdit(true);
      onProfileUpdated?.();
    } catch (error) {
      if (Platform.OS === "ios") reportProfileEdit(false);
      else setMessage(error instanceof Error ? error.message : "프로필 사진을 변경하지 못했습니다");
    } finally {
      setBusy(false);
    }
  };

  const saveName = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await api.editMember({ name: draft });
      setName(draft);
      setEditingName(false);
      reportProfileEdit(true);
      onProfileUpdated?.();
    } catch (error) {
      if (Platform.OS === "ios") reportProfileEdit(false);
      else setMessage(error instanceof Error ? error.message : "이름을 변경하지 못했습니다");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <View style={styles.profileIdentity}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="프로필 사진 변경"
          onPress={() => void changePhoto()}
          disabled={busy}
          style={styles.avatarButton}
        >
          <View style={styles.avatarWrap}>
            <SeugiAvatar
              uri={picture ? absoluteApiUrl(picture) : undefined}
              name={name}
              imageStyle={styles.avatar}
              fallbackStyle={styles.avatarPlaceholder}
            />
            {!picture ? (
              <Svg style={styles.avatarAdd} width={24} height={25} viewBox="0 0 24 25">
                <Path
                  d="M5.636 18.728C9.151 22.243 14.849 22.243 18.364 18.728C21.879 15.213 21.879 9.515 18.364 6C14.849 2.485 9.151 2.485 5.636 6C2.121 9.515 2.121 15.213 5.636 18.728ZM7.05 11.364C6.498 11.364 6.05 11.812 6.05 12.364C6.05 12.916 6.498 13.364 7.05 13.364H11L11 17.314C11 17.866 11.448 18.314 12 18.314C12.552 18.314 13 17.866 13 17.314V13.364H16.95C17.502 13.364 17.95 12.916 17.95 12.364C17.95 11.812 17.502 11.364 16.95 11.364H13L13 7.414C13 6.862 12.552 6.414 12 6.414C11.448 6.414 11 6.862 11 7.414L11 11.364H7.05Z"
                  fill={SeugiColor.Gray600}
                  fillRule="evenodd"
                />
              </Svg>
            ) : null}
          </View>
        </TouchableOpacity>
        <View style={styles.identityName}>
          <Text style={styles.nameText}>
            {name || "이름"}
            {nick ? ` (${nick})` : ""}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="이름 수정"
            onPress={() => {
              setDraft(name);
              setEditingName(true);
            }}
            disabled={busy}
            style={styles.editNameButton}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path
                d="m15.5 5.5 3 3M4 20l4.7-.9L20 7.8a2.1 2.1 0 0 0-3-3L5.7 16.1 4 20Z"
                fill="none"
                stroke={SeugiColor.Gray500}
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </TouchableOpacity>
        </View>
      </View>
      {busy ? <Text style={styles.muted}>변경 사항을 저장하는 중…</Text> : null}
      {message ? (
        <Text style={message.includes("변경") ? styles.answer : styles.error}>{message}</Text>
      ) : null}
      <Modal
        visible={editingName}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingName(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.editDialog, Platform.OS === "ios" && styles.iosEditDialog]}>
            {Platform.OS === "android" ? <View style={styles.sheetHandle} /> : null}
            <View style={[styles.editForm, Platform.OS === "android" && styles.androidEditForm]}>
              <Text style={styles.dialogTitle}>이름 수정</Text>
              <SeugiTextField
                autoFocus
                value={draft}
                onChangeText={setDraft}
                clearable
                placeholder={Platform.OS === "ios" ? undefined : "이름을 입력해주세요"}
              />
            </View>
            <Button
              label="저장"
              onPress={() => void saveName()}
              disabled={busy}
              loading={busy}
              {...authPrimaryButtonProps(nativePlatform())}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, backgroundColor: SeugiColor.White },
  contentContainer: { paddingTop: 0, paddingBottom: 150 },
  profileIdentity: { alignItems: "center", paddingTop: 8, paddingBottom: 4 },
  avatarButton: { width: 80, height: 80, alignItems: "center", justifyContent: "center" },
  avatarWrap: { width: 64, height: 64, alignItems: "center", justifyContent: "center" },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: SeugiColor.Gray300 },
  avatarPlaceholder: { width: 64, height: 64, borderRadius: 32 },
  avatarAdd: { position: "absolute", right: 4, bottom: 4 },
  identityName: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
  },
  nameText: { color: SeugiColor.Gray800, fontSize: 16, fontWeight: "600" },
  editNameButton: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  settingsRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 20,
    paddingRight: 20,
  },
  settingsRowTitle: { flex: 1, color: SeugiColor.Gray800, fontSize: 16, fontWeight: "600" },
  destructive: { color: SeugiColor.Red500 },
  link: { color: SeugiColor.Primary500 },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
  answer: { backgroundColor: SeugiColor.Primary100, padding: 10, borderRadius: 8 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
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
    gap: 32,
  },
  iosEditDialog: { height: 220, paddingBottom: 20 },
  sheetHandle: {
    alignSelf: "center",
    width: 32,
    height: 4,
    marginTop: -8,
    marginBottom: -12,
    borderRadius: 2,
    backgroundColor: SeugiColor.Gray300,
  },
  editForm: { gap: 16 },
  androidEditForm: { gap: 4 },
  dialogTitle: { paddingLeft: 4, color: SeugiColor.Black, fontSize: 16, fontWeight: "600" },
});
