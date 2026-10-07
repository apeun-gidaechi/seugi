import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import type { Member, Room, Workspace } from "@seugi/contracts";
import { Button, Card } from "../components/ui";
import { api } from "../services/api";

type RoomMessagesProps = { room: Room; onBack: () => void };

export function ChatScreen({
  workspace,
  roomType,
  RoomMessagesComponent,
}: {
  workspace: Workspace;
  roomType: "group" | "personal";
  RoomMessagesComponent: React.ComponentType<RoomMessagesProps>;
}) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<Room>();
  const [roomName, setRoomName] = useState("");
  const [roomSearch, setRoomSearch] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const [x, m] = await Promise.all([
      api.rooms(workspace.id, roomType),
      api.workspaceMembers(workspace.id),
    ]);
    setRooms(x.data ?? []);
    setMembers(m.data ?? []);
  }, [workspace.id, roomType]);
  useEffect(() => {
    setSelected(undefined);
    refresh().catch(() => undefined);
  }, [refresh]);
  const search = async (word = roomSearch) => {
    setMessage("");
    try {
      const result = word.trim()
        ? await api.searchRooms(workspace.id, word.trim(), roomType)
        : await api.rooms(workspace.id, roomType);
      setRooms(result.data ?? []);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "채팅방 검색에 실패했습니다");
    }
  };
  const create = async () => {
    if (!roomName.trim() || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await api.createRoom(roomType, {
        workspaceId: workspace.id,
        name: roomName.trim(),
        memberIds: selectedIds,
      });
      const list = await api.rooms(workspace.id, roomType);
      setRooms(list.data ?? []);
      setSelected(list.data?.find((room) => room.id === result.data));
      setRoomName("");
      setRoomSearch("");
      setSelectedIds([]);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "채팅방 생성에 실패했습니다");
    } finally {
      setBusy(false);
    }
  };
  if (selected)
    return (
      <RoomMessagesComponent
        room={selected}
        onBack={() => setSelected(undefined)}
      />
    );
  return (
    <FlatList
      style={styles.content}
      data={rooms}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <Card title={roomType === "group" ? "그룹 채팅방 만들기" : "채팅"}>
          <View style={styles.row}>
            <TextInput
              value={roomSearch}
              onChangeText={setRoomSearch}
              onSubmitEditing={() => void search()}
              returnKeyType="search"
              style={[styles.input, { flex: 1 }]}
              placeholder="채팅방 검색"
            />
            <Button
              label="검색"
              kind="secondary"
              onPress={() => void search()}
            />
          </View>
          <TextInput
            value={roomName}
            onChangeText={setRoomName}
            style={styles.input}
            placeholder="새 채팅방 이름"
          />
          <Text style={styles.muted}>초대할 구성원</Text>
          {members.map((member) => (
            <TouchableOpacity
              key={member.id}
              onPress={() =>
                setSelectedIds((current) =>
                  current.includes(member.id)
                    ? current.filter((id) => id !== member.id)
                    : [...current, member.id],
                )
              }
            >
              <Text
                style={
                  selectedIds.includes(member.id)
                    ? styles.activeTab
                    : styles.rowTitle
                }
              >
                {selectedIds.includes(member.id) ? "☑ " : "☐ "}
                {member.name}
              </Text>
            </TouchableOpacity>
          ))}
          <Button
            label={busy ? "만드는 중…" : "채팅방 만들기"}
            onPress={create}
            disabled={busy || !roomName.trim()}
          />
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
        <TouchableOpacity style={styles.row} onPress={() => setSelected(item)}>
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
  empty: { color: SeugiColor.Gray600, textAlign: "center", padding: 30 },
});
