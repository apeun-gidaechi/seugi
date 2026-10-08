import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { SeugiColor } from "@seugi/design-tokens";
import type { LegacyProfile, Room, WorkspaceMemberView } from "@seugi/contracts";
import { ChatInviteScreen } from "../screens/ChatInviteScreen";
import { SeugiAvatar } from "../design-system/Avatar";
import { SeugiChevronRight, SeugiCrownIcon } from "../design-system/NativeIndicators";
import { ChatNotificationToggle } from "../design-system/ChatNotificationToggle";
import { api } from "../services/api";
import { absoluteApiUrl } from "../utils/url";
import { canInviteRoomMembers } from "../utils/chat";

type RoomMember = NonNullable<Room["joinUserInfo"]>[number]["userInfo"];

type ChatRoomManagementProps = {
  room: Room;
  memberId: string;
  notificationEnabled: boolean;
  onNotificationToggle: () => void;
  onRoomChange: (room: Room) => void;
  onClose: () => void;
  onLeave: () => void;
  onOpenPersonalChat: (room: Room) => void;
};

/** Right-side member drawer from the native chat-detail screen. */
export function ChatRoomManagement({
  room,
  memberId,
  notificationEnabled,
  onNotificationToggle,
  onRoomChange,
  onClose,
  onLeave,
  onOpenPersonalChat,
}: ChatRoomManagementProps) {
  const { width } = useWindowDimensions();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMemberView[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [inviting, setInviting] = useState(false);
  const [profile, setProfile] = useState<LegacyProfile>();

  const drawerWidth = Platform.OS === "ios"
    ? Math.max(0, Math.min(320, width - 80))
    : Math.max(0, width - 62);
  const drawerInset = Platform.OS === "ios" ? width - drawerWidth : 62;
  const isGroupRoom = room.type === "GROUP";
  const canInvite = canInviteRoomMembers(room.type, Platform.OS);
  const members: RoomMember[] = room.joinUserInfo?.map(({ userInfo }) => userInfo)
    ?? room.memberIds.map((id) => ({ id, name: "구성원", email: "", birth: "" }));

  const refreshRoom = useCallback(async () => {
    const [result, workspaceResult] = await Promise.all([
      room.type === "GROUP" ? api.groupRoom(room.id) : api.personalRoom(room.id),
      api.workspaceMembers(room.workspaceId),
    ]);
    if (result.data) onRoomChange(result.data);
    setWorkspaceMembers(workspaceResult.data ?? []);
  }, [onRoomChange, room.id, room.type, room.workspaceId]);

  useEffect(() => {
    void refreshRoom().catch((error) => {
      setNotice(error instanceof Error ? error.message : "구성원 정보를 불러오지 못했습니다");
    });
  }, [refreshRoom]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (inviting) {
        setInviting(false);
        setSelectedIds([]);
        return true;
      }
      if (profile) {
        setProfile(undefined);
        return true;
      }
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [inviting, onClose, profile]);

  const run = async (action: () => Promise<unknown>, refresh = true) => {
    if (busy) return false;
    setBusy(true);
    setNotice("");
    try {
      await action();
      if (refresh) await refreshRoom();
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "채팅방을 변경하지 못했습니다");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const leave = () => {
    const confirmLeave = () => {
      void run(async () => {
        await api.leaveGroupRoom(room.id);
        onLeave();
      }, false);
    };
    if (Platform.OS === "ios") {
      Alert.alert("채팅방을 나가시겠습니까?", undefined, [
        { text: "닫기", style: "cancel" },
        { text: "나가기", style: "destructive", onPress: confirmLeave },
      ]);
    } else {
      confirmLeave();
    }
  };

  const openProfile = async (id: string) => {
    if (id === memberId || Platform.OS !== "android") return;
    try {
      const result = await api.profileOfOther(room.workspaceId, id);
      setProfile(result.data);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "프로필을 불러오지 못했습니다");
    }
  };

  const startPersonalChat = async () => {
    if (!profile || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const created = await api.createRoom("personal", {
        workspaceId: room.workspaceId,
        name: "",
        memberIds: [profile.member.id],
      });
      if (!created.data) throw new Error("채팅방을 열지 못했습니다");
      const result = await api.personalRoom(created.data);
      if (!result.data) throw new Error("채팅방 정보를 불러오지 못했습니다");
      setProfile(undefined);
      onClose();
      onOpenPersonalChat(result.data);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "개인 채팅을 시작하지 못했습니다");
    } finally {
      setBusy(false);
    }
  };

  if (inviting && canInvite) {
    return (
      <View style={styles.fullscreen}>
        <ChatInviteScreen
          members={workspaceMembers.filter((member) => !room.memberIds.includes(member.id))}
          selectedIds={selectedIds}
          busy={busy}
          notice={notice}
          onBack={() => {
            setInviting(false);
            setSelectedIds([]);
          }}
          onToggle={(id) => setSelectedIds((current) => current.includes(id)
            ? current.filter((selected) => selected !== id)
            : [...current, id])}
          onComplete={() => {
            void run(() => api.addGroupMembers(room.id, selectedIds)).then((success) => {
              if (success) {
                setInviting(false);
                setSelectedIds([]);
              }
            });
          }}
        />
      </View>
    );
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="멤버 패널 닫기"
        activeOpacity={1}
        onPress={onClose}
        style={styles.backdrop}
      />
      <View style={[styles.drawer, { left: drawerInset, width: drawerWidth }]}>
        <Text style={styles.title}>멤버</Text>
        <View style={styles.divider} />
        <FlatList
          data={members}
          keyExtractor={(member) => member.id}
          ListHeaderComponent={canInvite ? (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                setNotice("");
                setInviting(true);
              }}
              style={styles.inviteRow}
            >
              <Text style={styles.plus}>⊕</Text>
              <Text style={styles.inviteText}>멤버 초대하기</Text>
            </TouchableOpacity>
          ) : null}
          renderItem={({ item }) => (
            <TouchableOpacity
              accessibilityRole={Platform.OS === "android" ? "button" : undefined}
              accessibilityLabel={Platform.OS === "android" ? `${item.name} 프로필 보기` : undefined}
              disabled={Platform.OS !== "android" || item.id === memberId}
              onPress={() => void openProfile(item.id)}
              style={styles.memberRow}
            >
              <SeugiAvatar
                uri={item.picture ? absoluteApiUrl(item.picture) : undefined}
                name={item.name}
                imageStyle={styles.avatar}
                fallbackStyle={styles.avatarFallback}
              />
              <Text numberOfLines={1} style={styles.memberName}>{item.name}</Text>
              {item.id === room.adminId ? <SeugiCrownIcon color="#FFC700" size={20} /> : null}
              {Platform.OS === "android" ? <SeugiChevronRight /> : null}
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.rowDivider} />}
        />
        {notice ? <Text accessibilityRole="alert" style={styles.error}>{notice}</Text> : null}
        <View style={styles.footerDivider} />
        <View style={styles.footer}>
          {isGroupRoom ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="채팅방 나가기"
              disabled={busy}
              onPress={leave}
              style={styles.footerButton}
            >
              <Svg width={28} height={28} viewBox="0 0 24 24">
                <Path d="M4 3.75C4 3.336 4.336 3 4.75 3H14.25C14.664 3 15 3.336 15 3.75V3.886C15 4.301 14.664 4.636 14.25 4.636H6.285C5.871 4.636 5.535 4.972 5.535 5.386V18.614C5.535 19.028 5.871 19.364 6.285 19.364H14.25C14.664 19.364 15 19.699 15 20.114V20.25C15 20.664 14.664 21 14.25 21H4.75C4.336 21 4 20.664 4 20.25V3.75Z" fill={SeugiColor.Gray600} fillRule="evenodd" />
                <Path d="M14.757 6.697L19.53 11.47C19.823 11.763 19.823 12.238 19.53 12.53L14.757 17.303C14.465 17.596 13.99 17.596 13.697 17.303C13.404 17.01 13.404 16.536 13.697 16.243L17.189 12.75H9.75C9.336 12.75 9 12.414 9 12C9 11.586 9.336 11.25 9.75 11.25H17.189L13.697 7.757C13.404 7.464 13.404 6.99 13.697 6.697C13.99 6.404 14.465 6.404 14.757 6.697Z" fill={SeugiColor.Gray600} fillRule="evenodd" />
              </Svg>
            </TouchableOpacity>
          ) : null}
          <View style={styles.footerSpacer} />
          {Platform.OS === "android" ? (
            <>
              <ChatNotificationToggle enabled={notificationEnabled} onToggle={onNotificationToggle} />
              <View accessibilityRole="button" accessibilityLabel="설정" accessibilityState={{ disabled: true }} style={[styles.footerButton, styles.settingsButton]}>
                <Svg width={28} height={28} viewBox="0 0 24 24">
                  <Path d="M10.878 3L9.756 5.671C9.531 5.738 9.329 5.85 9.127 5.963L6.456 4.84L4.84 6.456L5.963 9.127C5.85 9.352 5.761 9.531 5.671 9.756L3 10.878V13.122L5.671 14.244C5.761 14.469 5.85 14.648 5.963 14.873L4.84 17.544L6.456 19.16L9.127 18.037C9.329 18.127 9.531 18.239 9.756 18.329L10.878 21H13.122L14.244 18.329C14.446 18.239 14.671 18.15 14.873 18.037L17.544 19.16L19.16 17.544L18.037 14.873C18.127 14.671 18.239 14.446 18.329 14.244L21 13.122V10.878L18.329 9.756C18.262 9.554 18.15 9.329 18.037 9.127L19.16 6.456L17.544 4.84L14.873 5.963C14.671 5.873 14.446 5.761 14.244 5.671L13.122 3L10.878 3ZM12 8.611C13.863 8.611 15.367 10.115 15.367 11.978C15.367 13.84 13.863 15.344 12 15.344C10.137 15.344 8.633 13.84 8.633 11.978C8.633 10.115 10.137 8.611 12 8.611Z" fill={SeugiColor.Gray600} fillRule="evenodd" />
                </Svg>
              </View>
            </>
          ) : null}
        </View>
      </View>
      <Modal visible={!!profile} transparent animationType="slide" onRequestClose={() => setProfile(undefined)}>
        <View style={styles.profileBackdrop}>
          <TouchableOpacity style={styles.profileDismiss} activeOpacity={1} onPress={() => setProfile(undefined)} />
          <View style={styles.profileSheet}>
            <View style={styles.profileHeader}>
              <SeugiAvatar
                uri={profile?.member.picture ? absoluteApiUrl(profile.member.picture) : undefined}
                name={profile?.member.name}
                imageStyle={styles.profileAvatar}
                fallbackStyle={styles.avatarFallback}
              />
              <View style={styles.profileIdentity}>
                <Text style={styles.profileName}>{profile?.member.name}{profile?.nick ? ` (${profile.nick})` : ""}</Text>
                <Text style={styles.profileRole}>{profile?.permission === "ADMIN" ? "관리자" : profile?.permission === "MIDDLE_ADMIN" ? "중간관리자" : profile?.permission === "TEACHER" ? "선생님" : "학생"}</Text>
              </View>
              <TouchableOpacity accessibilityRole="button" onPress={() => setProfile(undefined)}>
                <Text style={styles.profileClose}>닫기</Text>
              </TouchableOpacity>
            </View>
            {[ ["상태 메시지", profile?.status], ["학년·반·번호", [profile?.grade, profile?.class, profile?.number].filter(Boolean).join(" · ")], ["직위", profile?.spot], ["소속", profile?.belong], ["휴대전화", profile?.phone], ["유선전화", profile?.wire], ["근무 위치", profile?.location] ]
              .filter((row) => row[1])
              .map(([label, value]) => (
                <View key={String(label)} style={styles.profileField}>
                  <Text style={styles.profileRole}>{label}</Text>
                  <Text style={styles.memberName}>{value}</Text>
                </View>
              ))}
            <TouchableOpacity disabled={busy} onPress={() => void startPersonalChat()} style={styles.startChatButton}>
              <Text style={styles.startChatText}>{busy ? "여는 중…" : "개인 채팅 시작"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreen: { ...StyleSheet.absoluteFillObject, backgroundColor: SeugiColor.White },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.3)" },
  drawer: { position: "absolute", top: 0, bottom: 0, backgroundColor: SeugiColor.White },
  title: { height: 40, paddingHorizontal: 16, textAlignVertical: "center", color: SeugiColor.Gray800, fontSize: 14, fontWeight: "600" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: SeugiColor.Gray200 },
  inviteRow: { height: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 16 },
  plus: { width: 28, color: SeugiColor.Primary400, fontSize: 27, textAlign: "center" },
  inviteText: { color: SeugiColor.Primary400, fontSize: 14, fontWeight: "600" },
  memberRow: { height: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 16 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarFallback: { width: 36, height: 36, borderRadius: 18, backgroundColor: SeugiColor.Primary200, alignItems: "center", justifyContent: "center" },
  memberName: { flex: 1, color: SeugiColor.Gray800, fontSize: 14, fontWeight: "500" },
  rowDivider: { height: StyleSheet.hairlineWidth, backgroundColor: SeugiColor.Gray100, marginLeft: 68 },
  error: { color: SeugiColor.Red500, marginHorizontal: 16, marginVertical: 8, fontSize: 13 },
  footerDivider: { height: StyleSheet.hairlineWidth, backgroundColor: SeugiColor.Gray200 },
  footer: { height: 40, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 8 },
  footerSpacer: { flex: 1 },
  footerButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  settingsButton: { marginLeft: 8 },
  profileBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.32)" },
  profileDismiss: { flex: 1 },
  profileSheet: { backgroundColor: SeugiColor.White, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, gap: 10 },
  profileHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 12 },
  profileAvatar: { width: 32, height: 32, borderRadius: 16 },
  profileIdentity: { flex: 1 },
  profileName: { color: SeugiColor.Gray800, fontWeight: "700", fontSize: 18 },
  profileRole: { color: SeugiColor.Gray500, fontSize: 12 },
  profileClose: { color: SeugiColor.Primary500 },
  profileField: { borderTopWidth: 1, borderColor: SeugiColor.Gray100, paddingTop: 10, gap: 4 },
  startChatButton: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: SeugiColor.Primary500 },
  startChatText: { color: SeugiColor.White, fontSize: 15, fontWeight: "600" },
});
