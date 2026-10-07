import type { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
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
      style={[styles.button, kind === "secondary" && styles.secondary, disabled && styles.disabled]}
    >
      <Text style={kind === "primary" ? styles.buttonText : styles.secondaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: SeugiColor.Primary500, padding: 14, borderRadius: 10, alignItems: "center", marginBottom: 10 },
  secondary: { backgroundColor: SeugiColor.Primary100 },
  buttonText: { color: SeugiColor.White, fontWeight: "700" },
  secondaryText: { color: SeugiColor.Primary500, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  card: { backgroundColor: SeugiColor.White, borderRadius: 14, padding: 16, marginBottom: 12, gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: "700" },
});
