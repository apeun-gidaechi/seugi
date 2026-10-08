import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import { SeugiTextField } from "../design-system/TextField";
import { SeugiTopBar } from "../design-system/TopBar";
import { SeugiBackIcon } from "../design-system/BackIcon";
import { SeugiAddFillIcon } from "../design-system/AddIcon";

export function CreateGroupRoomNameScreen({
  placeholder,
  roomName,
  error,
  busy,
  onRoomNameChange,
  onBack,
  onComplete,
}: {
  placeholder: string;
  roomName: string;
  error: string;
  busy: boolean;
  onRoomNameChange: (name: string) => void;
  onBack: () => void;
  onComplete: () => void;
}) {
  return (
    <>
      <SeugiTopBar
        backgroundColor={SeugiColor.White}
        leading={
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="뒤로" onPress={onBack}>
            <SeugiBackIcon />
          </TouchableOpacity>
        }
        title={null}
        trailing={
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="완료"
            onPress={onComplete}
            disabled={busy}
          >
            <Text style={[styles.complete, busy && styles.disabled]}>
              {busy ? "생성 중…" : "완료"}
            </Text>
          </TouchableOpacity>
        }
      />
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{placeholder.slice(0, 1)}</Text>
          <SeugiAddFillIcon size={20} color={SeugiColor.Gray600} />
        </View>
        <Text style={styles.nameLabel}>채팅방 이름</Text>
        <SeugiTextField
          value={roomName}
          onChangeText={onRoomNameChange}
          clearable
          containerStyle={styles.inputSpacing}
          placeholder={placeholder}
          autoFocus
          editable={!busy}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  back: { color: SeugiColor.Gray700, fontSize: 30, lineHeight: 34 },
  complete: { color: SeugiColor.Gray800, fontSize: 15 },
  disabled: { color: SeugiColor.Gray400 },
  avatar: {
    alignSelf: "center",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: SeugiColor.Primary100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    position: "relative",
  },
  avatarText: { color: SeugiColor.Primary500, fontSize: 30, fontWeight: "700" },
  nameLabel: { color: SeugiColor.Gray800, fontSize: 16, fontWeight: "600", marginBottom: 4 },
  inputSpacing: { marginBottom: 10 },
  error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" },
});
