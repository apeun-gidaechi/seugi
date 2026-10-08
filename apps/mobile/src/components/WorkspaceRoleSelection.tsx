import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import { authPrimaryButtonProps } from "../utils/authButton";
import { Button, type WorkspaceJoinRole } from "./ui";
import { nativePlatform } from "../utils/platform";

const roles = [
  ["STUDENT", "학생", require("../../assets/img_student.png")],
  ["TEACHER", "선생님", require("../../assets/img_teacher.png")],
] as const;

export function WorkspaceRoleSelection({
  value,
  onChange,
  onContinue,
}: {
  value: WorkspaceJoinRole;
  onChange: (role: WorkspaceJoinRole) => void;
  onContinue: () => void;
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.heading}>학생이신가요?\n아니면 선생님이신가요?</Text>
        <View style={styles.options}>
          {roles.map(([role, label, image]) => {
            const selected = value === role;
            return (
              <TouchableOpacity
                key={role}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onChange(role)}
                style={[styles.card, selected && styles.cardSelected]}
              >
                <View style={styles.labelRow}>
                  <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
                  {selected ? <Text style={styles.check}>✓</Text> : null}
                </View>
                <Image source={image} resizeMode="contain" style={styles.image} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <Button label="계속하기" onPress={onContinue} {...authPrimaryButtonProps(nativePlatform())} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: SeugiColor.White,
  },
  content: { flex: 1, justifyContent: "center", gap: 8 },
  heading: {
    color: SeugiColor.Gray800,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 28,
    marginLeft: 4,
    marginBottom: 8,
  },
  options: { flex: 1, flexDirection: "row", gap: 8, maxHeight: 430 },
  card: {
    flex: 1,
    minHeight: 240,
    alignItems: "center",
    justifyContent: "space-evenly",
    overflow: "hidden",
    backgroundColor: SeugiColor.Gray100,
    borderColor: SeugiColor.Gray100,
    borderWidth: 1,
    borderRadius: 12,
    paddingTop: 18,
  },
  cardSelected: { borderColor: SeugiColor.Primary500 },
  labelRow: {
    minHeight: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  label: { color: SeugiColor.Gray500, fontSize: 16, fontWeight: "600" },
  labelSelected: { color: SeugiColor.Gray800 },
  check: { color: SeugiColor.Primary500, fontSize: 18, fontWeight: "700" },
  image: { width: 152, height: 152, maxWidth: "95%" },
});
