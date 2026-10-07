import { useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { SeugiColor } from "@seugi/design-tokens";
import { Button } from "../components/ui";
import { GoogleAuthButton } from "../components/GoogleAuthButton";
import { GOOGLE_WEB_CLIENT_ID } from "../config";
import { SeugiCodeTextField, SeugiPasswordTextField, SeugiTextField } from "../design-system/TextField";

type AuthScreenProps = {
  hydrated: boolean;
  appleAvailable: boolean;
  loading: boolean;
  error: string;
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  code: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onGoogleCode: (code: string) => Promise<void>;
  onAppleSignIn: () => Promise<void>;
  onError: (message: string) => void;
  onSendVerification: () => Promise<boolean>;
  onLogin: () => void;
  onRegister: () => void;
};

export function AuthScreen({ hydrated, appleAvailable, loading, error, email, password, confirmPassword, name, code, onEmailChange, onPasswordChange, onConfirmPasswordChange, onNameChange, onCodeChange, onGoogleCode, onAppleSignIn, onError, onSendVerification, onLogin, onRegister }: AuthScreenProps) {
  const [screen, setScreen] = useState<"start" | "login" | "signup" | "verification">("start");
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (screen === "start") return false;
      setScreen(screen === "verification" ? "signup" : "start");
      return true;
    });
    return () => subscription.remove();
  }, [screen]);
  if (!hydrated) return <SafeAreaView style={styles.auth}><ActivityIndicator size="large" color={SeugiColor.Primary500} /><Text style={styles.subtitle}>로그인 정보를 확인하는 중…</Text></SafeAreaView>;
  return <SafeAreaView style={styles.auth}>
    {screen !== "start" ? <TouchableOpacity accessibilityRole="button" onPress={() => setScreen(screen === "verification" ? "signup" : "start")}><Text style={styles.back}>‹ 뒤로</Text></TouchableOpacity> : null}
    <Text style={styles.logo}>스기</Text>
    {screen === "start" ? <>
      <Text style={styles.subtitle}>학교의 모든 소통을 한 곳에서</Text>
      {appleAvailable ? <AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN} buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK} cornerRadius={10} style={{ width: "100%", height: 48, marginBottom: 10 }} onPress={onAppleSignIn} /> : null}
      {Platform.OS !== "web" && GOOGLE_WEB_CLIENT_ID ? <GoogleAuthButton label="Google로 로그인" onCode={onGoogleCode} onError={onError} disabled={loading} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}><Button label="이메일로 로그인" onPress={() => setScreen("login")} /><Button label="이메일로 회원가입" kind="secondary" onPress={() => setScreen("signup")} /></View>
    </> : null}
    {screen === "login" ? <>
      <Text style={styles.subtitle}>이메일로 로그인</Text>
      <SeugiTextField placeholder="이메일" autoCapitalize="none" keyboardType="email-address" containerStyle={styles.inputSpacing} value={email} onChangeText={onEmailChange} />
      <SeugiPasswordTextField placeholder="비밀번호" containerStyle={styles.inputSpacing} value={password} onChangeText={onPasswordChange} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label={loading ? "로그인 중…" : "로그인"} onPress={onLogin} disabled={loading || !email || !password} />
      <TouchableOpacity onPress={() => setScreen("signup")}><Text style={styles.link}>계정이 없으신가요? 회원가입</Text></TouchableOpacity>
    </> : null}
    {screen === "signup" ? <>
      <Text style={styles.subtitle}>이메일 회원가입</Text>
      <SeugiTextField placeholder="이름" containerStyle={styles.inputSpacing} value={name} onChangeText={onNameChange} />
      <SeugiTextField placeholder="이메일" autoCapitalize="none" keyboardType="email-address" containerStyle={styles.inputSpacing} value={email} onChangeText={onEmailChange} />
      <SeugiPasswordTextField placeholder="비밀번호 (8자 이상)" containerStyle={styles.inputSpacing} value={password} onChangeText={onPasswordChange} />
      <SeugiPasswordTextField placeholder="비밀번호를 다시 입력해 주세요" containerStyle={styles.inputSpacing} value={confirmPassword} onChangeText={onConfirmPasswordChange} />
      {confirmPassword && password !== confirmPassword ? <Text style={styles.error}>비밀번호가 다릅니다</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label={loading ? "발송 중…" : "인증 코드 보내기"} kind="secondary" onPress={async () => { if (await onSendVerification()) setScreen("verification"); }} disabled={!email || !name || password.length < 8 || !confirmPassword || password !== confirmPassword || loading} />
    </> : null}
    {screen === "verification" ? <>
      <Text style={styles.subtitle}>이메일 인증</Text>
      <Text style={styles.hint}>{email}로 전송한 인증 코드를 입력해 주세요.</Text>
      <SeugiCodeTextField value={code} limit={6} onChangeText={(value) => onCodeChange(value.replace(/\D/g, ""))} error={!!error} containerStyle={styles.inputSpacing} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label={loading ? "가입 중…" : "인증하고 가입"} onPress={onRegister} disabled={loading || !code || !password || !name} />
      <TouchableOpacity onPress={async () => { if (await onSendVerification()) onError("인증 코드를 다시 발송했습니다."); }}><Text style={styles.link}>인증 코드 다시 받기</Text></TouchableOpacity>
    </> : null}
  </SafeAreaView>;
}

const styles = StyleSheet.create({ auth: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: SeugiColor.Primary050 }, logo: { color: SeugiColor.Primary500, fontWeight: "800", fontSize: 36, textAlign: "center" }, subtitle: { textAlign: "center", color: SeugiColor.Gray600, marginVertical: 24 }, inputSpacing: { marginBottom: 10 }, error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" }, back: { alignSelf: "flex-start", color: SeugiColor.Gray700, fontSize: 16, paddingVertical: 8 }, link: { textAlign: "center", color: SeugiColor.Primary500, marginTop: 18 }, hint: { textAlign: "center", color: SeugiColor.Gray600, marginBottom: 16 }, actions: { gap: 10, marginTop: 12 } });
