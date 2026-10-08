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
import { shouldShowTextFieldClearButton } from "../utils/textField";

type SeugiTextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
  onClear?: () => void;
  clearable?: boolean;
  trailing?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
  fieldStyle?: StyleProp<ViewStyle>;
};

/** Seugi's standard 52pt field with animated-focus-equivalent state colors. */
export function SeugiTextField({
  label,
  error,
  onClear,
  clearable,
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
  const showClearButton = shouldShowTextFieldClearButton({
    platform: Platform.OS,
    clearable,
    hasCustomClearAction: onClear !== undefined,
    hasValue: !!value,
    editable,
  });
  const clearValue = onClear ?? (() => inputProps.onChangeText?.(""));
  return (
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          fieldStyle,
          focused && styles.focused,
          disabled && (Platform.OS === "ios" ? styles.iosDisabled : styles.disabled),
          !!error && styles.invalid,
        ]}
      >
        <TextInput
          {...inputProps}
          value={value}
          editable={editable}
          autoCapitalize={inputProps.autoCapitalize ?? "none"}
          autoCorrect={inputProps.autoCorrect ?? (Platform.OS === "ios" ? false : undefined)}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          placeholderTextColor={disabled ? SeugiColor.Gray400 : SeugiColor.Gray500}
          selectionColor={SeugiColor.Primary500}
          style={[styles.input, disabled && styles.disabledInput, style]}
        />
        {trailing}
        {showClearButton ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="입력 내용 지우기"
            onPress={clearValue}
            style={styles.clearButton}
          >
            <Svg width={28} height={28} viewBox="0 0 24 24">
              <Path d={CLEAR_ICON_PATH} fill={SeugiColor.Gray500} fillRule="evenodd" />
            </Svg>
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function SeugiPasswordTextField(
  props: Omit<SeugiTextFieldProps, "secureTextEntry" | "trailing">,
) {
  const [hidden, setHidden] = useState(true);
  const iconPaths =
    Platform.OS === "ios"
      ? hidden
        ? PASSWORD_HIDE_ICON_PATHS
        : PASSWORD_SHOW_ICON_PATHS
      : hidden
        ? PASSWORD_SHOW_ICON_PATHS
        : PASSWORD_HIDE_ICON_PATHS;
  return (
    <SeugiTextField
      {...props}
      clearable={false}
      secureTextEntry={hidden}
      trailing={
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={hidden ? "비밀번호 표시" : "비밀번호 숨기기"}
          onPress={() => setHidden((current) => !current)}
          style={styles.visibilityButton}
        >
          <Svg width={28} height={28} viewBox="0 0 24 24">
            {iconPaths.map((path, index) => (
              <Path
                key={`password-icon-${index}`}
                d={path}
                fill={SeugiColor.Gray500}
                fillRule="evenodd"
              />
            ))}
          </Svg>
        </TouchableOpacity>
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
          <View
            key={index}
            style={[
              styles.codeCell,
              focused &&
                (value.length === index || (index === limit - 1 && value.length === limit)) &&
                styles.focused,
              error && styles.invalid,
            ]}
          >
            <Text style={styles.codeDigit}>{value[index] ?? ""}</Text>
          </View>
        ))}
      </View>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? "인증 코드"}
        value={value}
        onChangeText={(next) => onChangeText(next.slice(0, limit))}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
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
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="첨부 메뉴"
          onPress={onAddClick}
          disabled={!editable}
          style={styles.chatAction}
        >
          <Svg width={32} height={32} viewBox="0 0 24 25">
            <Path
              d="M5.636 18.728C9.151 22.243 14.849 22.243 18.364 18.728C21.879 15.213 21.879 9.515 18.364 6C14.849 2.485 9.151 2.485 5.636 6C2.121 9.515 2.121 15.213 5.636 18.728ZM7.05 11.364C6.498 11.364 6.05 11.812 6.05 12.364C6.05 12.916 6.498 13.364 7.05 13.364H11V17.314C11 17.866 11.448 18.314 12 18.314C12.552 18.314 13 17.866 13 17.314V13.364H16.95C17.502 13.364 17.95 12.916 17.95 12.364C17.95 11.812 17.502 11.364 16.95 11.364H13V7.414C13 6.862 12.552 6.414 12 6.414C11.448 6.414 11 6.862 11 7.414V11.364H7.05Z"
              fill={SeugiColor.Gray400}
              fillRule="evenodd"
            />
          </Svg>
        </TouchableOpacity>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSendClick}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect={Platform.OS === "ios" ? false : undefined}
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
        <Svg width={32} height={32} viewBox="0 0 24 24">
          <Path
            d="M19.975 20.772C20.385 20.864 20.719 20.437 20.53 20.06L12.447 3.894C12.263 3.526 11.737 3.526 11.553 3.894L3.47 20.06C3.282 20.437 3.614 20.864 4.025 20.772L9.81 19.376C10.223 19.284 10.534 18.941 10.585 18.52L11.899 11.324C11.9 11.319 11.901 11.313 11.901 11.308C11.917 10.703 12.085 11.2 12.099 11.316L13.415 18.52C13.466 18.941 13.777 19.284 14.19 19.376L19.975 20.772Z"
            fill={sendEnabled && editable ? SeugiColor.Primary500 : SeugiColor.Gray400}
            fillRule="evenodd"
          />
        </Svg>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: SeugiColor.Gray700,
    fontFamily: "Pretendard",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  field: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: Platform.OS === "ios" ? 1 : 1.5,
    borderColor: Platform.OS === "ios" ? SeugiColor.Gray300 : SeugiColor.Gray400,
    borderRadius: 12,
    backgroundColor: SeugiColor.White,
    paddingHorizontal: 16,
  },
  focused: { borderWidth: 1.5, borderColor: SeugiColor.Primary500 },
  invalid: { borderColor: SeugiColor.Red500 },
  disabled: { backgroundColor: SeugiColor.White },
  iosDisabled: { backgroundColor: SeugiColor.White, borderColor: SeugiColor.Gray200 },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 49,
    paddingVertical: 0,
    color: SeugiColor.Gray800,
    fontFamily: "Pretendard",
    fontSize: 16,
  },
  disabledInput: { color: SeugiColor.Gray400 },
  clearButton: { minWidth: 28, minHeight: 28, alignItems: "center", justifyContent: "center" },
  visibilityButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  error: { color: SeugiColor.Red500, fontSize: 12, marginTop: 4 },
  codeRoot: { minHeight: 52, justifyContent: "center" },
  codeCells: { flexDirection: "row", gap: 4 },
  codeCell: {
    flex: 1,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: SeugiColor.Gray300,
    borderRadius: 12,
    backgroundColor: SeugiColor.White,
  },
  codeDigit: {
    color: SeugiColor.Gray800,
    fontFamily: "Pretendard",
    fontSize: 16,
    fontWeight: "600",
  },
  codeInput: { ...StyleSheet.absoluteFillObject, opacity: 0.02, color: "transparent" },
  chatField: {
    minHeight: Platform.OS === "android" ? 60 : 56,
    maxHeight: 216,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: SeugiColor.White,
    shadowColor: SeugiColor.Black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  chatAction: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  chatInput: {
    flex: 1,
    minWidth: 0,
    height: 32,
    paddingVertical: 5,
    color: SeugiColor.Gray800,
    fontFamily: "Pretendard",
    fontSize: 16,
  },
  chatMultiline: { minHeight: 32, maxHeight: 176, textAlignVertical: "bottom" },
});

const CLEAR_ICON_PATH =
  "M12,21C16.971,21 21,16.971 21,12C21,7.029 16.971,3 12,3C7.029,3 3,7.029 3,12C3,16.971 7.029,21 12,21ZM7.793,14.793C7.402,15.183 7.402,15.817 7.793,16.207C8.183,16.598 8.817,16.598 9.207,16.207L12,13.414L14.793,16.207C15.183,16.598 15.817,16.598 16.207,16.207C16.598,15.817 16.598,15.183 16.207,14.793L13.414,12L16.207,9.207C16.598,8.817 16.598,8.183 16.207,7.793C15.817,7.402 15.183,7.402 14.793,7.793L12,10.586L9.207,7.793C8.817,7.402 8.183,7.402 7.793,7.793C7.402,8.183 7.402,8.817 7.793,9.207L10.586,12L7.793,14.793Z";
const PASSWORD_SHOW_ICON_PATHS = [
  "M11.55,13.965C12.599,13.965 12.999,13.523 12.999,12.423C12.999,11.323 12.599,10.878 11.55,10.878C10.501,10.878 10.101,11.323 10.101,12.423C10.101,13.523 10.501,13.965 11.55,13.965Z",
  "M20.1,12.423C20.106,15.401 16.05,18.843 11.55,18.843C7.05,18.843 2.994,15.401 3,12.423C3.384,9.594 7.05,6 11.55,6C16.05,6 19.716,9.594 20.1,12.423ZM7.869,15.231C6.212,13.715 6.182,11.108 7.809,9.56C9.905,7.566 13.196,7.566 15.291,9.56C16.918,11.108 16.888,13.715 15.231,15.231C13.151,17.135 9.95,17.135 7.869,15.231Z",
];
const PASSWORD_HIDE_ICON_PATHS = [
  "M9.883,14.118C10.324,14.59 10.943,14.715 11.55,14.715C11.759,14.715 11.969,14.7 12.174,14.661L9.351,12.465C9.356,13.061 9.465,13.669 9.883,14.118Z",
  "M11.55,5.25C9.099,5.25 6.894,6.227 5.256,7.571L5.829,8.072L6.455,8.534L7.203,9.104L7.809,9.56L8.391,10.042C10.2,8.385 12.99,8.405 14.774,10.103C16.085,11.351 16.062,13.454 14.725,14.678C14.666,14.732 14.545,14.835 14.545,14.835L17.883,17.413C17.914,17.389 17.946,17.365 17.977,17.34C19.646,16.035 20.854,14.235 20.85,12.422C20.85,12.388 20.848,12.355 20.843,12.322C20.618,10.663 19.466,8.901 17.844,7.571C16.206,6.227 14.001,5.25 11.55,5.25Z",
  "M5.123,17.34C6.816,18.665 9.114,19.593 11.55,19.593C13.436,19.593 15.239,19.036 16.743,18.171L13.344,15.556C11.701,16.232 9.753,15.939 8.375,14.678C7.354,13.744 7.099,12.297 7.619,11.11L4.232,8.534C3.16,9.693 2.431,11.039 2.257,12.322C2.252,12.355 2.25,12.388 2.25,12.422C2.246,14.235 3.454,16.035 5.123,17.34Z",
  "M2.988,4.241C2.693,4.013 2.269,4.067 2.041,4.362C1.813,4.657 1.867,5.081 2.162,5.309L21.962,20.609C22.257,20.837 22.681,20.783 22.909,20.488C23.137,20.193 23.083,19.769 22.788,19.541L13.747,12.555C13.748,12.511 13.749,12.467 13.749,12.423C13.749,11.814 13.645,11.188 13.217,10.728C12.777,10.254 12.158,10.128 11.55,10.128C11.274,10.128 10.996,10.154 10.734,10.226L2.988,4.241ZM10.734,10.226L13.747,12.555C13.735,13.033 13.648,13.513 13.383,13.908L9.677,11C9.735,10.904 9.803,10.813 9.882,10.728C10.123,10.469 10.417,10.314 10.734,10.226Z",
  "M9.882,10.728C9.803,10.813 9.735,10.904 9.677,11L13.383,13.908C13.648,13.513 13.735,13.033 13.747,12.555L10.734,10.226C10.417,10.314 10.123,10.469 9.882,10.728Z",
];
