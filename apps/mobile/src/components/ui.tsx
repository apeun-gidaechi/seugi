import type { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";

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
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        kind === "secondary" && styles.secondary,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={kind === "primary" ? styles.buttonText : styles.secondaryText}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
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
      <View style={styles.roleOptions}>
        {roles.map(([role, label]) => (
          <TouchableOpacity
            key={role}
            accessibilityRole="button"
            accessibilityState={{ selected: value === role }}
            onPress={() => onChange(role)}
            style={[
              styles.roleOption,
              value === role
                ? styles.roleOptionSelected
                : styles.roleOptionUnselected,
            ]}
          >
            <Text
              style={value === role ? styles.activeTab : styles.inactiveTab}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: SeugiColor.Primary500,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  secondary: { backgroundColor: SeugiColor.Primary100 },
  buttonText: { color: SeugiColor.White, fontWeight: "700" },
  secondaryText: { color: SeugiColor.Primary500, fontWeight: "700" },
  disabled: { opacity: 0.5 },
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
  activeTab: { color: SeugiColor.Primary500, fontWeight: "700" },
  inactiveTab: { color: SeugiColor.Gray500 },
  roleOptions: { flexDirection: "row", gap: 8 },
  roleOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 9,
  },
  roleOptionSelected: { backgroundColor: SeugiColor.Primary100 },
  roleOptionUnselected: { backgroundColor: SeugiColor.Gray100 },
});
