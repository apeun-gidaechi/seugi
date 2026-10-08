import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { Room, Workspace } from "@seugi/contracts";
import { api } from "../services/api";
import { absoluteApiUrl } from "../utils/url";
import { SeugiAvatar } from "../design-system/Avatar";
import { SeugiBadge } from "../design-system/Badge";
import { matchesChatRoomSearch } from "../utils/chat";

export type ChatImagePreview = { url: string; name: string; onSend?: () => void; onClose?: () => void };
type RoomMessagesProps = { room: Room; onBack: () => void; onOpenRoom: (room: Room) => void; onPreviewImage: (image: ChatImagePreview) => void };

export function ChatScreen({
  workspace,
  roomType,
  RoomMessagesComponent,
  initialRoom,
  isFocused = true,
  onConversationChange,
  onPreviewImage,
  roomSearch,
}: {
  workspace: Workspace;
  roomType: "group" | "personal";
  RoomMessagesComponent: React.ComponentType<RoomMessagesProps>;
  initialRoom?: Room;
  isFocused?: boolean;
  onConversationChange: (room?: Room) => void;
  onPreviewImage: (image: ChatImagePreview) => void;
  roomSearch: string;
}) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selected, setSelected] = useState<Room | undefined>(initialRoom);
  const [refreshing, setRefreshing] = useState(false);
  const previousWorkspaceId = useRef(workspace.id);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await api.rooms(workspace.id, roomType);
      setRooms(sortRooms(result.data));
    } finally {
      setRefreshing(false);
    }
  }, [workspace.id, roomType]);
  useEffect(() => {
    if (previousWorkspaceId.current === workspace.id) return;
    previousWorkspaceId.current = workspace.id;
    setRooms([]);
    setSelected(undefined);
    onConversationChange(undefined);
  }, [workspace.id]);
  useEffect(() => {
    if (!initialRoom) return;
    setSelected(initialRoom);
    onConversationChange(initialRoom);
  }, [initialRoom?.id]);
  useEffect(() => { void refresh().catch(() => undefined); }, [refresh]);
  useEffect(() => {
    if (!isFocused) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!selected) return false;
      setSelected(undefined);
      onConversationChange(undefined);
      return true;
    });
    return () => subscription.remove();
  }, [isFocused, onConversationChange, selected]);
  const visibleRooms = rooms.filter((room) => matchesChatRoomSearch(
    Platform.OS === "ios" ? "ios" : "android",
    room.chatName || room.name,
    roomSearch,
  ));
  if (selected)
    return (
      <RoomMessagesComponent
        key={selected.id}
        room={selected}
        onPreviewImage={onPreviewImage}
        onBack={() => { setSelected(undefined); onConversationChange(undefined); }}
        onOpenRoom={(room) => { setSelected(room); onConversationChange(room); }}
      />
    );
  return (
    <FlatList
      style={styles.content}
      data={visibleRooms}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh().catch(() => undefined)} tintColor={SeugiColor.Primary500} colors={[SeugiColor.Primary500]} />}
      ListEmptyComponent={
        <Text style={styles.empty}>
          {roomSearch
            ? "검색 결과가 없습니다."
            : "아직 참여한 채팅방이 없습니다."}
        </Text>
      }
      renderItem={({ item }) => (
        <TouchableOpacity accessibilityRole="button" style={styles.row} onPress={() => { setSelected(item); onConversationChange(item); }}>
          <SeugiAvatar uri={(item.image ?? item.chatRoomImg) ? absoluteApiUrl(item.image ?? item.chatRoomImg ?? "") : undefined} name={item.chatName || item.name} imageStyle={styles.roomAvatarImage} fallbackStyle={styles.roomAvatar} />
          <View style={styles.roomInfo}>
            <View style={styles.roomTitleRow}>
              <Text style={styles.rowTitle} numberOfLines={1}>{item.chatName || item.name}</Text>
              {Platform.OS === "ios" && roomType === "group" ? <Text style={styles.memberCount}>{item.joinUserInfo?.length ?? item.memberIds.length}</Text> : null}
            </View>
            {(Platform.OS !== "ios" || item.lastMessage != null) ? <Text style={styles.muted} numberOfLines={1}>{item.lastMessage ?? ""}</Text> : null}
          </View>
          <View style={styles.roomMeta}>
            <Text style={styles.timestamp}>{formatChatTime(item.lastMessageTimestamp)}</Text>
            {(item.notReadCnt ?? 0) > 0 ? <SeugiBadge count={item.notReadCnt} /> : null}
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, backgroundColor: SeugiColor.White },
  row: { minHeight: 68, paddingHorizontal: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: SeugiColor.White },
  roomAvatar: { width: 36, height: 36, borderRadius: 18, overflow: "hidden", backgroundColor: SeugiColor.Primary200, alignItems: "center", justifyContent: "center" },
  roomAvatarImage: { width: 36, height: 36, borderRadius: 18 },
  roomInfo: { flex: 1, minWidth: 0, gap: 4 },
  roomTitleRow: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  memberCount: { color: SeugiColor.Gray500, fontSize: 13 },
  roomMeta: { alignItems: "flex-end", gap: 4 },
  timestamp: { color: SeugiColor.Gray500, fontSize: 12 },
  activeTab: { color: SeugiColor.Primary500, fontWeight: "700" },
  inactiveTab: { color: SeugiColor.Gray500 },
  muted: { color: Platform.OS === "ios" ? SeugiColor.Gray600 : SeugiColor.Black, fontSize: 14 },
  rowTitle: { color: SeugiColor.Black, fontSize: 16, fontWeight: "600" },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  empty: { color: SeugiColor.Gray600, textAlign: "center", padding: 30 },
});

function sortRooms(items?: Room[]) {
  return [...(items ?? [])].sort((left, right) =>
    (right.lastMessageTimestamp ?? "").localeCompare(left.lastMessageTimestamp ?? ""),
  );
}

function formatChatTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (Platform.OS === "ios") {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startYesterday = new Date(startToday);
    startYesterday.setDate(startYesterday.getDate() - 1);
    const startLastYear = new Date(now.getFullYear() - 1, 0, 1);
    if (date >= startToday) return `${date.getHours() < 12 ? "오전" : "오후"} ${String(date.getHours() % 12 || 12).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    if (date >= startYesterday || date >= startLastYear) return `${date.getMonth() + 1}월 ${date.getDate()}일`;
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  }
  const hour = date.getHours();
  const displayHour = hour >= 12 && hour !== 12 ? hour - 12 : hour;
  return `${hour < 12 ? "오전" : "오후"} ${String(displayHour).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
