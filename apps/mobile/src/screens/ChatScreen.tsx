import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  FlatList,
  Image,
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

type RoomMessagesProps = { room: Room; onBack: () => void; onOpenRoom: (room: Room) => void };

export function ChatScreen({
  workspace,
  roomType,
  RoomMessagesComponent,
  initialRoom,
  onConversationChange,
  roomSearch,
  roomSearchActive,
}: {
  workspace: Workspace;
  roomType: "group" | "personal";
  RoomMessagesComponent: React.ComponentType<RoomMessagesProps>;
  initialRoom?: Room;
  onConversationChange: (room?: Room) => void;
  roomSearch: string;
  roomSearchActive: boolean;
}) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selected, setSelected] = useState<Room | undefined>(initialRoom);
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const searchRequest = useRef(0);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await api.rooms(workspace.id, roomType);
      setRooms(sortRooms(result.data));
    } finally {
      setRefreshing(false);
    }
  }, [workspace.id, roomType]);
  useEffect(() => { if (initialRoom) onConversationChange(initialRoom); }, [initialRoom?.id]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (roomSearchActive || !roomSearch) void search(roomSearch);
      else void refresh().catch(() => undefined);
    }, roomSearchActive && roomSearch ? 180 : 0);
    return () => clearTimeout(timer);
  }, [refresh, roomSearch, roomSearchActive]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!selected) return false;
      setSelected(undefined);
      onConversationChange(undefined);
      return true;
    });
    return () => subscription.remove();
  }, [onConversationChange, selected]);
  const search = async (word = roomSearch) => {
    const requestId = ++searchRequest.current;
    setMessage("");
    try {
      const result = word.trim()
        ? await api.searchRooms(workspace.id, word.trim(), roomType)
        : await api.rooms(workspace.id, roomType);
      if (requestId !== searchRequest.current) return;
      setRooms(sortRooms(result.data));
    } catch (e) {
      if (requestId === searchRequest.current) setMessage(e instanceof Error ? e.message : "채팅방 검색에 실패했습니다");
    }
  };
  if (selected)
    return (
      <RoomMessagesComponent
        key={selected.id}
        room={selected}
        onBack={() => { setSelected(undefined); onConversationChange(undefined); }}
        onOpenRoom={(room) => { setSelected(room); onConversationChange(room); }}
      />
    );
  return (
    <FlatList
      style={styles.content}
      data={rooms}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void (roomSearch.trim() ? search(roomSearch) : refresh()).catch(() => undefined)} tintColor={SeugiColor.Primary500} colors={[SeugiColor.Primary500]} />}
      ListHeaderComponent={message ? <Text style={styles.error}>{message}</Text> : null}
      ListEmptyComponent={
        <Text style={styles.empty}>
          {roomSearch.trim()
            ? "검색 결과가 없습니다."
            : "아직 참여한 채팅방이 없습니다."}
        </Text>
      }
      renderItem={({ item }) => (
        <TouchableOpacity accessibilityRole="button" style={styles.row} onPress={() => { setSelected(item); onConversationChange(item); }}>
          <View style={styles.roomAvatar}>{(item.image ?? item.chatRoomImg) ? <Image source={{ uri: absoluteApiUrl(item.image ?? item.chatRoomImg ?? "") }} style={styles.roomAvatarImage} /> : <Text style={styles.roomAvatarText}>{item.name.slice(0, 1)}</Text>}</View>
          <View style={styles.roomInfo}>
            <View style={styles.roomTitleRow}>
              <Text style={styles.rowTitle} numberOfLines={1}>{item.name}</Text>
              {roomType === "group" ? <Text style={styles.memberCount}>{item.memberIds.length}</Text> : null}
            </View>
            <Text style={styles.muted} numberOfLines={1}>{item.lastMessage ?? ""}</Text>
          </View>
          <View style={styles.roomMeta}>
            <Text style={styles.timestamp}>{formatChatTime(item.lastMessageTimestamp)}</Text>
            {(item.notReadCnt ?? 0) > 0 ? <Text style={styles.unreadBadge}>{item.notReadCnt! > 300 ? "300+" : item.notReadCnt}</Text> : null}
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 16 },
  row: { minHeight: 80, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: SeugiColor.White },
  roomAvatar: { width: 48, height: 48, borderRadius: 24, overflow: "hidden", backgroundColor: SeugiColor.Primary100, alignItems: "center", justifyContent: "center" },
  roomAvatarImage: { width: 48, height: 48 },
  roomAvatarText: { color: SeugiColor.Primary500, fontSize: 19, fontWeight: "600" },
  roomInfo: { flex: 1, minWidth: 0, gap: 4 },
  roomTitleRow: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  memberCount: { color: SeugiColor.Gray500, fontSize: 13 },
  roomMeta: { alignItems: "flex-end", gap: 4 },
  timestamp: { color: SeugiColor.Gray500, fontSize: 12 },
  unreadBadge: { minWidth: 20, overflow: "hidden", textAlign: "center", color: SeugiColor.White, backgroundColor: SeugiColor.Yellow100, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, fontSize: 11 },
  activeTab: { color: SeugiColor.Primary500, fontWeight: "700" },
  inactiveTab: { color: SeugiColor.Gray500 },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
  rowTitle: { fontWeight: "600" },
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
  const hour = date.getHours();
  const displayHour = hour >= 12 && hour !== 12 ? hour - 12 : hour;
  return `${hour < 12 ? "오전" : "오후"} ${String(displayHour).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
