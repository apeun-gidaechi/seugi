import { useState } from "react";
import type { ReactNode } from "react";
import {
  Pressable,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { SeugiColor } from "@seugi/design-tokens";

type SeugiTextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
  onClear?: () => void;
  trailing?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  fieldStyle?: StyleProp<ViewStyle>;
};

/** Seugi's standard 52pt field with animated-focus-equivalent state colors. */
export function SeugiTextField({
  label,
  error,
  onClear,
  trailing,
  containerStyle,
  fieldStyle,
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
          fieldStyle,
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
  label,
  value,
  onChangeText,
  limit = 6,
  error,
  containerStyle,
  keyboardType = "number-pad",
  ...props
}: Omit<TextInputProps, "value" | "onChangeText" | "maxLength"> & {
  value: string;
  onChangeText: (value: string) => void;
  limit?: number;
  label?: string;
  error?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.codeRoot, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
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
        keyboardType={keyboardType}
        maxLength={limit}
        selectionColor={SeugiColor.Primary500}
        style={styles.codeInput}
      />
    </View>
  );
}

/** Seugi message composer with the native add/send affordances. */
export function SeugiChatTextField({
  value,
  onChangeText,
  onSendClick,
  onAddClick,
  placeholder = "메세지 보내기",
  sendEnabled = true,
  editable = true,
  multiline = Platform.OS === "android",
}: {
  value: string;
  onChangeText: (value: string) => void;
  onSendClick: () => void;
  onAddClick?: () => void;
  placeholder?: string;
  sendEnabled?: boolean;
  editable?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={styles.chatField}>
      {onAddClick ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="첨부 메뉴" onPress={onAddClick} disabled={!editable} style={styles.chatAction}>
          <Svg width={32} height={32} viewBox="0 0 24 25"><Path d="M5.636 18.728C9.151 22.243 14.849 22.243 18.364 18.728C21.879 15.213 21.879 9.515 18.364 6C14.849 2.485 9.151 2.485 5.636 6C2.121 9.515 2.121 15.213 5.636 18.728ZM7.05 11.364C6.498 11.364 6.05 11.812 6.05 12.364C6.05 12.916 6.498 13.364 7.05 13.364H11V17.314C11 17.866 11.448 18.314 12 18.314C12.552 18.314 13 17.866 13 17.314V13.364H16.95C17.502 13.364 17.95 12.916 17.95 12.364C17.95 11.812 17.502 11.364 16.95 11.364H13V7.414C13 6.862 12.552 6.414 12 6.414C11.448 6.414 11 6.862 11 7.414V11.364H7.05Z" fill={SeugiColor.Gray400} fillRule="evenodd" /></Svg>
        </TouchableOpacity>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSendClick}
        placeholder={placeholder}
        placeholderTextColor={SeugiColor.Gray500}
        selectionColor={SeugiColor.Primary500}
        editable={editable}
        multiline={multiline}
        blurOnSubmit={!multiline}
        returnKeyType="send"
        style={[styles.chatInput, multiline && styles.chatMultiline]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="메시지 보내기"
        accessibilityState={{ disabled: !sendEnabled || !editable }}
        disabled={!sendEnabled || !editable}
        onPress={onSendClick}
        style={styles.chatAction}
      >
        <Svg width={32} height={32} viewBox="0 0 24 24"><Path d="M19.975 20.772C20.385 20.864 20.719 20.437 20.53 20.06L12.447 3.894C12.263 3.526 11.737 3.526 11.553 3.894L3.47 20.06C3.282 20.437 3.614 20.864 4.025 20.772L9.81 19.376C10.223 19.284 10.534 18.941 10.585 18.52L11.899 11.324C11.9 11.319 11.901 11.313 11.901 11.308C11.917 10.703 12.085 11.2 12.099 11.316L13.415 18.52C13.466 18.941 13.777 19.284 14.19 19.376L19.975 20.772Z" fill={sendEnabled && editable ? SeugiColor.Primary500 : SeugiColor.Gray400} fillRule="evenodd" /></Svg>
      </Pressable>
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
  chatField: { minHeight: 56, maxHeight: 216, flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: SeugiColor.White, shadowColor: SeugiColor.Black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  chatAction: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  chatInput: { flex: 1, minWidth: 0, height: 32, paddingVertical: 5, color: SeugiColor.Gray800, fontFamily: "Pretendard", fontSize: 16 },
  chatMultiline: { minHeight: 32, maxHeight: 176, textAlignVertical: "bottom" },
});
