import { useState } from "react";
import type { ReactNode } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { SeugiColor } from "@seugi/design-tokens";

type SeugiTextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
  onClear?: () => void;
  trailing?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
};

/** Seugi's standard 52pt field with animated-focus-equivalent state colors. */
export function SeugiTextField({
  label,
  error,
  onClear,
  trailing,
  containerStyle,
  style,
  onFocus,
  onBlur,
  editable = true,
  value,
  ...inputProps
}: SeugiTextFieldProps) {
  const [focused, setFocused] = useState(false);
  const disabled = !editable;
  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          focused && styles.focused,
          disabled && styles.disabled,
          !!error && styles.invalid,
        ]}
      >
        <TextInput
          {...inputProps}
          value={value}
          editable={editable}
          onFocus={(event) => { setFocused(true); onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); onBlur?.(event); }}
          placeholderTextColor={disabled ? SeugiColor.Gray400 : SeugiColor.Gray500}
          selectionColor={SeugiColor.Primary500}
          style={[styles.input, style]}
        />
        {trailing}
        {onClear && !!value && editable ? (
          <Text accessibilityRole="button" onPress={onClear} style={styles.clear}>
            ×
          </Text>
        ) : null}
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function SeugiPasswordTextField(props: Omit<SeugiTextFieldProps, "secureTextEntry" | "trailing">) {
  const [hidden, setHidden] = useState(true);
  return (
    <SeugiTextField
      {...props}
      secureTextEntry={hidden}
      trailing={
        <Text accessibilityRole="button" accessibilityLabel={hidden ? "비밀번호 표시" : "비밀번호 숨기기"} onPress={() => setHidden((current) => !current)} style={styles.visibility}>
          {hidden ? "보기" : "숨기기"}
        </Text>
      }
    />
  );
}

/** Six-cell code input matching the native Seugi verification control. */
export function SeugiCodeTextField({
  value,
  onChangeText,
  limit = 6,
  error,
  containerStyle,
  ...props
}: Omit<TextInputProps, "value" | "onChangeText" | "maxLength"> & {
  value: string;
  onChangeText: (value: string) => void;
  limit?: number;
  error?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.codeRoot, containerStyle]}>
      <View pointerEvents="none" style={styles.codeCells}>
        {Array.from({ length: limit }, (_, index) => (
          <View key={index} style={[styles.codeCell, focused && (value.length === index || (index === limit - 1 && value.length === limit)) && styles.focused, error && styles.invalid]}>
            <Text style={styles.codeDigit}>{value[index] ?? ""}</Text>
          </View>
        ))}
      </View>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? "인증 코드"}
        value={value}
        onChangeText={(next) => onChangeText(next.slice(0, limit))}
        onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
        onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
        keyboardType="number-pad"
        maxLength={limit}
        selectionColor={SeugiColor.Primary500}
        style={styles.codeInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: SeugiColor.Gray700, fontFamily: "Pretendard", fontSize: 14, fontWeight: "600", marginBottom: 6 },
  field: { minHeight: 52, flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: SeugiColor.Gray400, borderRadius: 12, backgroundColor: SeugiColor.White, paddingHorizontal: 16 },
  focused: { borderColor: SeugiColor.Primary500 },
  invalid: { borderColor: SeugiColor.Red500 },
  disabled: { backgroundColor: SeugiColor.Gray100 },
  input: { flex: 1, minWidth: 0, minHeight: 49, paddingVertical: 0, color: SeugiColor.Gray800, fontFamily: "Pretendard", fontSize: 16 },
  clear: { paddingHorizontal: 4, color: SeugiColor.Gray500, fontSize: 24 },
  visibility: { paddingLeft: 8, color: SeugiColor.Gray500, fontFamily: "Pretendard", fontSize: 12 },
  error: { color: SeugiColor.Red500, fontSize: 12, marginTop: 4 },
  codeRoot: { minHeight: 52, justifyContent: "center" },
  codeCells: { flexDirection: "row", gap: 4 },
  codeCell: { flex: 1, height: 52, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: SeugiColor.Gray300, borderRadius: 12, backgroundColor: SeugiColor.White },
  codeDigit: { color: SeugiColor.Gray800, fontFamily: "Pretendard", fontSize: 16, fontWeight: "600" },
  codeInput: { ...StyleSheet.absoluteFillObject, opacity: 0.02, color: "transparent" },
});
