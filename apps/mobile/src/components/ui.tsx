import type { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import { SeugiButton } from "../design-system/Button";
import { SeugiSegmentedControl } from "../design-system/SegmentedControl";

export { SeugiButton } from "../design-system/Button";

export type WorkspaceJoinRole = "STUDENT" | "TEACHER" | "MIDDLE_ADMIN";

export function Card({
  title,
  children,
  onPress,
}: {
  title: string;
  children: ReactNode;
  onPress?: () => void;
}) {
  return (
    <View style={styles.card}>
      {onPress ? (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onPress}
          style={styles.cardHeader}
        >
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardArrow}>›</Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.cardTitle}>{title}</Text>
      )}
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  kind = "primary",
  disabled,
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "secondary";
  disabled?: boolean;
}) {
  return <SeugiButton label={label} onPress={onPress} variant={kind === "primary" ? "primary" : "gray"} disabled={disabled} style={styles.buttonSpacing} />;
}

export function WorkspaceRolePicker({
  value,
  onChange,
}: {
  value: WorkspaceJoinRole;
  onChange: (role: WorkspaceJoinRole) => void;
}) {
  const roles: Array<[WorkspaceJoinRole, string]> = [
    ["STUDENT", "학생"],
    ["TEACHER", "교사"],
    ["MIDDLE_ADMIN", "중간관리자"],
  ];
  return (
    <View>
      <Text style={styles.muted}>가입 유형</Text>
      <SeugiSegmentedControl value={value} options={roles.map(([role, label]) => ({ value: role, label }))} onChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  buttonSpacing: { marginBottom: 10 },
  card: {
    backgroundColor: SeugiColor.White,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: { fontSize: 17, fontWeight: "700" },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardArrow: { color: SeugiColor.Gray500, fontSize: 24, lineHeight: 24 },
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
});
