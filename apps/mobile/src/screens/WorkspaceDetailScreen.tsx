import { useEffect, useState } from "react";
import {
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { SeugiColor } from "@seugi/design-tokens";
import type { Role, Workspace } from "@seugi/contracts";
import { Button } from "../components/ui";
import { SeugiListItem } from "../design-system/ListItem";
import { PendingWorkspaceRequests } from "./WorkspaceSetupScreen";
import { api } from "../services/api";
import { authPrimaryButtonProps } from "../utils/authButton";
import { absoluteApiUrl } from "../utils/url";
import { nativePlatform } from "../utils/platform";

export type WorkspaceSection =
  | "workspaceGeneral"
  | "workspaceMembers"
  | "workspaceInvite"
  | "workspaceNotifications"
  | "workspaceCreate"
  | "workspaceJoin";

export function WorkspaceDetailScreen({
  workspaces,
  workspace,
  onSelect,
  onNavigate,
  onReload,
}: {
  workspaces: Workspace[];
  workspace: Workspace;
  onSelect: (value: Workspace) => void;
  onNavigate: (section: WorkspaceSection) => void;
  onReload: () => Promise<void>;
}) {
  const [workspacePickerOpen, setWorkspacePickerOpen] = useState(false);
  const [role, setRole] = useState<Role>("STUDENT");
  useEffect(() => {
    let active = true;
    Promise.all([api.memberInfo(), api.myProfile(workspace.id)])
      .then(([member, profile]) => {
        if (!active) return;
        setRole(
          workspace.ownerId === member.data?.id ? "ADMIN" : (profile.data?.role ?? "STUDENT"),
        );
      })
      .catch(() => active && setRole("STUDENT"));
    return () => {
      active = false;
    };
  }, [workspace.id, workspace.ownerId]);
  const canInvite =
    Platform.OS === "ios" ? role !== "STUDENT" : role === "ADMIN" || role === "MIDDLE_ADMIN";

  return (
    <>
      <ScrollView style={styles.content}>
        <View
          style={[styles.workspaceHero, Platform.OS === "ios" ? styles.workspaceHeroIOS : null]}
        >
          {workspace.image ? (
            <Image
              source={{ uri: absoluteApiUrl(workspace.image) }}
              style={styles.workspaceAvatar}
            />
          ) : (
            <View style={styles.workspaceAvatarPlaceholder}>
              <Text style={styles.link}>{workspace.name.slice(0, 1)}</Text>
            </View>
          )}
          <View style={styles.workspaceHeroText}>
            <Text style={styles.rowTitle}>{workspace.name}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setWorkspacePickerOpen(true)}
              style={styles.switchButton}
            >
              <Text style={styles.switchButtonText}>학교 전환</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.workspaceDivider} />
        <View style={styles.workspaceSectionHeading}>
          <WorkspaceSectionIcon kind="settings" />
        </View>
        <WorkspaceNavigationRow title="일반" onPress={() => onNavigate("workspaceGeneral")} />
        <WorkspaceNavigationRow
          title="알림 설정"
          onPress={() => onNavigate("workspaceNotifications")}
        />
        <View style={styles.membersSection}>
          <View style={styles.workspaceSectionHeading}>
            <WorkspaceSectionIcon kind="members" />
          </View>
        </View>
        <WorkspaceNavigationRow title="멤버" onPress={() => onNavigate("workspaceMembers")} />
        {canInvite ? (
          <WorkspaceNavigationRow title="멤버 초대" onPress={() => onNavigate("workspaceInvite")} />
        ) : null}
      </ScrollView>
      <Modal
        visible={workspacePickerOpen}
        transparent
        animationType={Platform.OS === "ios" ? "slide" : "fade"}
        onRequestClose={() => setWorkspacePickerOpen(false)}
      >
        <View
          style={[
            styles.pickerBackdrop,
            Platform.OS === "android" ? styles.androidPickerBackdrop : null,
          ]}
        >
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.pickerDismiss}
            activeOpacity={1}
            onPress={() => setWorkspacePickerOpen(false)}
          />
          <View style={[styles.picker, Platform.OS === "android" ? styles.androidPicker : null]}>
            {Platform.OS === "ios" ? <View style={styles.sheetHandle} /> : null}
            <Text style={styles.dialogTitle}>가입된 학교</Text>
            <ScrollView style={styles.pickerList}>
              {workspaces.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.workspaceOption,
                    Platform.OS === "android" ? styles.androidWorkspaceOption : null,
                  ]}
                  onPress={() => {
                    setWorkspacePickerOpen(false);
                    onSelect(item);
                  }}
                >
                  {Platform.OS === "ios" ? (
                    item.image ? (
                      <Image
                        source={{ uri: absoluteApiUrl(item.image) }}
                        style={styles.workspaceOptionAvatar}
                      />
                    ) : (
                      <View style={styles.workspaceOptionAvatarPlaceholder}>
                        <Text style={styles.link}>{item.name.slice(0, 1)}</Text>
                      </View>
                    )
                  ) : null}
                  <Text
                    style={
                      Platform.OS === "android"
                        ? styles.androidWorkspaceName
                        : item.id === workspace.id
                          ? styles.activeTab
                          : styles.rowTitle
                    }
                  >
                    {item.name}
                    {Platform.OS === "ios" && item.id === workspace.id ? " · 선택됨" : ""}
                  </Text>
                  {Platform.OS === "android" ? (
                    <Svg width={24} height={24} viewBox="0 0 24 24">
                      <Path
                        fill={SeugiColor.Gray500}
                        fillRule="evenodd"
                        d="M8.293 4.293a1 1 0 0 1 1.414 0l6.823 6.823a1.25 1.25 0 0 1 0 1.768l-6.823 6.823a1 1 0 1 1-1.414-1.414L14.586 12 8.293 5.707a1 1 0 0 1 0-1.414"
                      />
                    </Svg>
                  ) : null}
                </TouchableOpacity>
              ))}
              {Platform.OS === "android" ? <PendingWorkspaceRequests onChanged={onReload} /> : null}
            </ScrollView>
            <View style={styles.pickerActions}>
              <Button
                label="새 학교 만들기"
                kind="secondary"
                onPress={() => {
                  setWorkspacePickerOpen(false);
                  onNavigate("workspaceCreate");
                }}
                {...authPrimaryButtonProps(nativePlatform())}
              />
              <Button
                label="기존 학교 가입"
                onPress={() => {
                  setWorkspacePickerOpen(false);
                  onNavigate("workspaceJoin");
                }}
                {...authPrimaryButtonProps(nativePlatform())}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function WorkspaceSectionIcon({ kind }: { kind: "settings" | "members" }) {
  const color = "#111111";
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" accessibilityElementsHidden>
      {kind === "settings" ? (
        <Path
          fill={color}
          d="M10.878 3 9.756 5.671c-.225.067-.427.179-.629.292L6.456 4.84 4.84 6.456l1.123 2.671c-.113.225-.202.404-.292.629L3 10.878v2.244l2.671 1.122c.09.225.179.404.292.629L4.84 17.544l1.616 1.616 2.671-1.123c.202.09.404.202.629.292L10.878 21h2.244l1.122-2.671c.202-.09.427-.179.629-.292l2.671 1.123 1.616-1.616-1.123-2.671c.09-.202.202-.427.292-.629L21 13.122v-2.244l-2.671-1.122c-.067-.202-.179-.427-.292-.629l1.123-2.671-1.616-1.616-2.671 1.123c-.202-.09-.427-.202-.629-.292L13.122 3zM12 8.611a3.367 3.367 0 1 1 0 6.733 3.367 3.367 0 0 1 0-6.733"
        />
      ) : (
        <Path
          fill={color}
          fillRule="evenodd"
          d="M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8M8 13h8a5 5 0 0 1 5 5 3 3 0 0 1-3 3H6a3 3 0 0 1-3-3 5 5 0 0 1 5-5"
        />
      )}
    </Svg>
  );
}

function WorkspaceNavigationRow({ title, onPress }: { title: string; onPress: () => void }) {
  return <SeugiListItem title={title} onPress={onPress} showChevron />;
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  activeTab: { color: SeugiColor.Primary500, fontWeight: "700" },
  rowTitle: { fontWeight: "600" },
  link: { color: SeugiColor.Primary500 },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
  workspaceHero: {
    height: 96,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  workspaceHeroIOS: { height: 84 },
  workspaceHeroText: { flex: 1, gap: 8 },
  workspaceAvatar: { width: 48, height: 48, borderRadius: 24 },
  workspaceAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: SeugiColor.Primary100,
    alignItems: "center",
    justifyContent: "center",
  },
  switchButton: {
    alignSelf: "flex-start",
    backgroundColor: SeugiColor.Gray100,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  switchButtonText: { color: SeugiColor.Gray600, fontSize: 13 },
  workspaceDivider: { height: 8, backgroundColor: SeugiColor.Gray100 },
  workspaceSectionHeading: { height: 40, justifyContent: "center", paddingHorizontal: 16 },
  membersSection: { marginTop: 24 },
  pickerBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.32)" },
  androidPickerBackdrop: { justifyContent: "center", padding: 20 },
  pickerDismiss: { flex: 1 },
  picker: {
    maxHeight: "75%",
    backgroundColor: SeugiColor.White,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  androidPicker: {
    maxHeight: "85%",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: SeugiColor.Gray300,
    alignSelf: "center",
    marginBottom: 16,
  },
  dialogTitle: { color: SeugiColor.Gray800, fontSize: 17, fontWeight: "700" },
  pickerList: { marginTop: 12 },
  workspaceOption: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: SeugiColor.Gray100,
  },
  androidWorkspaceOption: {
    minHeight: 56,
    paddingHorizontal: 16,
    marginBottom: 4,
    borderBottomWidth: 0,
    borderRadius: 8,
    backgroundColor: SeugiColor.Gray100,
    gap: 0,
  },
  androidWorkspaceName: { color: SeugiColor.Gray800, fontWeight: "600", flex: 1 },
  workspaceOptionAvatar: { width: 36, height: 36, borderRadius: 18 },
  workspaceOptionAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SeugiColor.Primary100,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerActions: { flexDirection: "row", gap: 8, paddingTop: 12 },
});
