import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import type { Notification, Workspace } from "@seugi/contracts";
import { api } from "../services/api";
import { SeugiTextField } from "../design-system/TextField";
import { SeugiTopBar } from "../design-system/TopBar";
import { SeugiBackIcon } from "../design-system/BackIcon";

export function NoticeEditorScreen({
  workspace,
  initial,
  onSaved,
  onSaveSucceeded,
  onCancel,
}: {
  workspace: Workspace;
  initial?: Notification;
  onSaved: () => Promise<void>;
  onSaveSucceeded?: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [busy, setBusy] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  useEffect(() => {
    let active = true;
    if (!initial)
      return () => {
        active = false;
      };
    Promise.all([api.memberInfo(), api.myProfile(workspace.id)])
      .then(([member, profile]) => {
        if (!active) return;
        setCanDelete(
          initial.authorId === member.data?.id ||
            ["ADMIN", "MIDDLE_ADMIN"].includes(profile.data?.role ?? ""),
        );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [initial, workspace.id]);
  const remove = async () => {
    if (!initial || !canDelete || busy) return;
    setBusy(true);
    try {
      await api.deleteNotification(workspace.id, initial.id);
      ToastAndroid.show("삭제에 성공하였습니다", ToastAndroid.SHORT);
      onSaveSucceeded?.();
      await onSaved();
    } catch (error) {
      ToastAndroid.show(
        error instanceof Error ? error.message : "공지를 삭제하지 못했습니다",
        ToastAndroid.SHORT,
      );
    } finally {
      setBusy(false);
    }
  };
  const submit = async () => {
    if (!title || !content || busy) return;
    setBusy(true);
    try {
      if (initial) await api.updateNotification({ id: initial.id, title, content });
      else await api.createNotification({ workspaceId: workspace.id, title, content });
      onSaveSucceeded?.();
      if (Platform.OS === "ios") {
        Alert.alert(initial ? "공지 수정 성공" : "공지 작성 성공", undefined, [
          {
            text: "닫기",
            onPress: () => {
              void onSaved();
            },
          },
        ]);
      } else {
        ToastAndroid.show(
          initial ? "수정에 성공하였습니다" : "등록에 성공하였습니다",
          ToastAndroid.SHORT,
        );
        await onSaved();
      }
    } catch (error) {
      if (Platform.OS === "ios") {
        Alert.alert(initial ? "공지 수정 실패" : "공지 작성 실패", "잠시 후 다시 시도해 주세요", [
          { text: "확인", onPress: onCancel },
        ]);
      } else {
        ToastAndroid.show(
          error instanceof Error ? error.message : "공지 저장에 실패했습니다",
          ToastAndroid.SHORT,
        );
      }
    } finally {
      setBusy(false);
    }
  };
  const invalid = !title || !content;
  const disabled = busy || (Platform.OS === "ios" && invalid);

  return (
    <View style={styles.screen}>
      <SeugiTopBar
        leading={
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="뒤로"
            onPress={onCancel}
            disabled={busy}
          >
            <SeugiBackIcon />
          </TouchableOpacity>
        }
        title={<Text style={styles.title}>{initial ? "공지 수정" : "새 공지 작성"}</Text>}
        trailing={
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="완료"
            accessibilityState={{ disabled, busy }}
            onPress={() => void submit()}
            disabled={disabled}
            style={styles.doneAction}
          >
            {Platform.OS === "ios" && busy ? (
              <ActivityIndicator size="small" color={SeugiColor.Gray800} />
            ) : (
              <Text style={[styles.done, Platform.OS === "ios" && invalid && styles.doneDisabled]}>
                완료
              </Text>
            )}
          </TouchableOpacity>
        }
      />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.fields}
      >
        <SeugiTextField
          autoFocus={Platform.OS === "ios"}
          value={title}
          onChangeText={setTitle}
          onClear={() => setTitle("")}
          containerStyle={styles.field}
          placeholder="제목을 입력해 주세요"
          editable={!busy}
          returnKeyType="next"
        />
        <SeugiTextField
          value={content}
          onChangeText={setContent}
          onClear={() => setContent("")}
          containerStyle={styles.field}
          fieldStyle={styles.bodyField}
          style={styles.bodyInput}
          placeholder="내용을 입력해 주세요"
          multiline
          editable={!busy}
        />
        {initial && Platform.OS === "android" ? (
          <View style={styles.deleteRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="공지 삭제"
              accessibilityState={{ disabled: busy || !canDelete }}
              onPress={() => void remove()}
              disabled={busy || !canDelete}
              style={styles.deleteButton}
            >
              <Svg width={28} height={28} viewBox="0 0 24 24">
                <Path
                  d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"
                  fill="none"
                  stroke={SeugiColor.Gray500}
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SeugiColor.White },
  scroll: { flex: 1 },
  fields: { paddingHorizontal: 20, paddingTop: 6 },
  title: { color: SeugiColor.Gray800, fontSize: 18, fontWeight: "700" },
  back: { color: SeugiColor.Gray700, fontSize: 30, lineHeight: 34 },
  doneAction: {
    minWidth: 56,
    minHeight: 36,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  done: { color: SeugiColor.Gray800, fontSize: 14 },
  doneDisabled: { color: SeugiColor.Gray300 },
  field: { marginBottom: 8 },
  bodyField: { minHeight: 360, height: undefined, alignItems: "flex-start" },
  bodyInput: { minHeight: 360, paddingTop: 14, paddingBottom: 14, textAlignVertical: "top" },
  deleteRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 8 },
  deleteButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
});
