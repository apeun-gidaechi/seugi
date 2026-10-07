import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { Room, Workspace } from "@seugi/contracts";
import { Button, Card } from "../components/ui";
import { api } from "../services/api";

type RoomMessagesProps = { room: Room; onBack: () => void; onOpenRoom: (room: Room) => void };

export function ChatScreen({
  workspace,
  roomType,
  RoomMessagesComponent,
  onCreateRoom,
  initialRoom,
  onConversationChange,
}: {
  workspace: Workspace;
  roomType: "group" | "personal";
  RoomMessagesComponent: React.ComponentType<RoomMessagesProps>;
  onCreateRoom: () => void;
  initialRoom?: Room;
  onConversationChange: (room?: Room) => void;
}) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selected, setSelected] = useState<Room | undefined>(initialRoom);
  const [roomSearch, setRoomSearch] = useState("");
  const [roomSearchActive, setRoomSearchActive] = useState(false);
  const [message, setMessage] = useState("");
  const searchRequest = useRef(0);
  const refresh = useCallback(async () => {
    const x = await api.rooms(workspace.id, roomType);
    setRooms(x.data ?? []);
  }, [workspace.id, roomType]);
  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);
  useEffect(() => { if (initialRoom) onConversationChange(initialRoom); }, [initialRoom?.id]);
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
      setRooms(result.data ?? []);
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
      ListHeaderComponent={
        <Card title={roomType === "group" ? "단체 채팅" : "채팅"}>
          {!roomSearchActive ? <Button label={roomType === "group" ? "단체 채팅방 만들기" : "새 채팅 시작"} onPress={onCreateRoom} /> : null}
          {!roomSearchActive ? <TouchableOpacity accessibilityRole="button" style={styles.searchToggle} onPress={() => setRoomSearchActive(true)}><Text style={styles.link}>⌕ 채팅방 검색</Text></TouchableOpacity> : <View style={styles.row}>
            <TextInput
              value={roomSearch}
              onChangeText={(value) => { setRoomSearch(value); void search(value); }}
              onSubmitEditing={() => void search()}
              returnKeyType="search"
              style={[styles.input, { flex: 1 }]}
              placeholder="채팅방 검색"
            />
            <TouchableOpacity accessibilityRole="button" onPress={() => { setRoomSearch(""); setRoomSearchActive(false); void search(""); }}><Text style={styles.link}>취소</Text></TouchableOpacity>
          </View>}
          {message ? <Text style={styles.error}>{message}</Text> : null}
        </Card>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          {roomSearch.trim()
            ? "검색 결과가 없습니다."
            : "아직 참여한 채팅방이 없습니다."}
        </Text>
      }
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.row} onPress={() => { setSelected(item); onConversationChange(item); }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.muted} numberOfLines={1}>
              {item.lastMessage || "아직 메시지가 없습니다."}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <Text>{item.memberIds.length}명</Text>
            {(item.notReadCnt ?? 0) > 0 ? (
              <Text style={styles.activeTab}>{item.notReadCnt}개 안 읽음</Text>
            ) : null}
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 16 },
  row: {
    backgroundColor: SeugiColor.White,
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  activeTab: { color: SeugiColor.Primary500, fontWeight: "700" },
  inactiveTab: { color: SeugiColor.Gray500 },
  input: {
    backgroundColor: SeugiColor.White,
    borderWidth: 1,
    borderColor: SeugiColor.Gray300,
    borderRadius: 10,
    padding: 13,
    marginBottom: 10,
  },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
  rowTitle: { fontWeight: "600" },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
  searchToggle: { paddingVertical: 8, alignItems: "flex-end" },
  link: { color: SeugiColor.Primary500 },
  empty: { color: SeugiColor.Gray600, textAlign: "center", padding: 30 },
});
