import { useState } from "react";
import { Platform } from "react-native";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { Button } from "./ui";

export function GoogleAuthButton({
  label,
  onCode,
  onError,
  disabled = false,
}: {
  label: string;
  onCode: (code: string) => Promise<void>;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const signIn = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      if (Platform.OS === "android") await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
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

  return <Button label={busy ? "Google 인증 중…" : label} kind="secondary" onPress={signIn} disabled={disabled || busy} />;
}
