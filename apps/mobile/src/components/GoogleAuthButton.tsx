import { useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity } from "react-native";
import Svg, { Path } from "react-native-svg";
import { SeugiColor } from "@seugi/design-tokens";
import { isPlaygroundApp } from "../appVariant";

/** Playground native builds omit Google Sign-In autolinking; never load the TurboModule. */
function loadGoogleSignin() {
  if (isPlaygroundApp()) return null;
  try {
    return require("@react-native-google-signin/google-signin")
      .GoogleSignin as typeof import("@react-native-google-signin/google-signin").GoogleSignin;
  } catch {
    return null;
  }
}

export function GoogleAuthButton({
  label,
  onCode,
  onStart,
  onError,
  configured = true,
  disabled = false,
}: {
  label: string;
  onCode: (code: string) => Promise<void>;
  onStart?: () => void;
  onError: (message: string) => void;
  configured?: boolean;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const signIn = async () => {
    if (busy || disabled) return;
    if (!configured) {
      onError("Google 로그인을 사용하려면 EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID 설정이 필요합니다.");
      return;
    }
    const GoogleSignin = loadGoogleSignin();
    if (!GoogleSignin) {
      onError("이 빌드에서는 Google 로그인 네이티브 모듈을 사용할 수 없습니다.");
      return;
    }
    setBusy(true);
    onStart?.();
    try {
      if (Platform.OS === "android")
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();
      if (response.type === "cancelled") return;
      const code = response.data.serverAuthCode;
      if (!code) throw new Error("Google 서버 인증 코드를 받지 못했습니다");
      await onCode(code);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Google 인증에 실패했습니다");
    } finally {
      setBusy(false);
    }
  };

  const inactive = disabled || busy;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={busy ? "Google 인증 중" : label}
      accessibilityState={{ disabled: inactive, busy }}
      activeOpacity={0.8}
      onPress={() => void signIn()}
      disabled={inactive}
      style={[
        Platform.OS === "ios" ? styles.iosButton : styles.androidButton,
        inactive && styles.inactive,
      ]}
    >
      <Svg
        width={Platform.OS === "ios" ? 20 : 25}
        height={Platform.OS === "ios" ? 20 : 25}
        viewBox="0 0 20 20"
      >
        <Path
          d="M19.6 10.2273c0-.70908-.0636-1.39088-.1818-2.04548H10v3.86818h5.3818c-.2318 1.25-.9364 2.3091-1.9954 3.0182v2.5091h3.2318c1.8909-1.7409 2.9818-4.3046 2.9818-7.35Z"
          fill="#4285F4"
        />
        <Path
          d="M10 20c2.7 0 4.9636-.8955 6.6182-2.4227l-3.2317-2.5091c-.8955.6-2.041.9545-3.3864.9545-2.6046 0-4.8091-1.7591-5.5955-4.1227H1.0637v2.5909C2.7092 17.7591 6.091 20 10 20Z"
          fill="#34A853"
        />
        <Path
          d="M4.4045 11.9c-.2-.6-.3136-1.2409-.3136-1.9s.1136-1.3.3136-1.9V5.5091H1.0636C.3864 6.8591 0 8.3864 0 10s.3864 3.1409 1.0636 4.4909l3.3409-2.5909Z"
          fill="#FBBC04"
        />
        <Path
          d="M10 3.9773c1.4683 0 2.7864.5045 3.8227 1.4954L16.691 2.6045C14.9591.9909 12.6955 0 10 0 6.091 0 2.7092 2.2409 1.0637 5.5091L4.4045 8.1C5.191 5.7364 7.3955 3.9773 10 3.9773Z"
          fill="#E94235"
        />
      </Svg>
      <Text style={styles.label}>{busy ? "Google 인증 중…" : label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  androidButton: {
    width: "100%",
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: SeugiColor.Gray300,
    borderRadius: 12,
    backgroundColor: SeugiColor.White,
  },
  iosButton: {
    width: "100%",
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 8,
    backgroundColor: SeugiColor.White,
  },
  label: { color: SeugiColor.Black, fontSize: 16, fontWeight: "600" },
  inactive: { opacity: 0.55 },
});
