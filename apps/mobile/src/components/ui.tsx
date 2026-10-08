import type { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import { SeugiButton } from "../design-system/Button";
import { SeugiSegmentedControl } from "../design-system/SegmentedControl";
import { SeugiChevronRight } from "../design-system/NativeIndicators";

export { SeugiButton } from "../design-system/Button";

export type WorkspaceJoinRole = "STUDENT" | "TEACHER";

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
          <SeugiChevronRight />
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
  loading = false,
  size = "small",
  fullWidth = false,
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  size?: "large" | "medium" | "small";
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const variant = kind === "danger" ? "red" : kind === "secondary" ? "gray" : "primary";
  return <SeugiButton label={label} onPress={onPress} variant={variant} size={size} fullWidth={fullWidth} disabled={disabled} loading={loading} style={[styles.buttonSpacing, style]} />;
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
  muted: { color: SeugiColor.Gray500, fontSize: 12 },
});
