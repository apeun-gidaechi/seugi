import { useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
  const [verificationWaiting, setVerificationWaiting] = useState(false);
  const [verificationSeconds, setVerificationSeconds] = useState(300);
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (screen === "start") return false;
      setScreen(screen === "verification" ? "signup" : "start");
      return true;
    });
    return () => subscription.remove();
  }, [screen]);
  useEffect(() => {
    if (!verificationWaiting) return;
    const timer = setInterval(() => setVerificationSeconds((remaining) => {
      if (remaining <= 1) { setVerificationWaiting(false); return 300; }
      return remaining - 1;
    }), 1_000);
    return () => clearInterval(timer);
  }, [verificationWaiting]);
  if (!hydrated) return <SafeAreaView style={styles.auth}><ActivityIndicator size="large" color={SeugiColor.Primary500} /><Text style={styles.subtitle}>로그인 정보를 확인하는 중…</Text></SafeAreaView>;
  if (screen === "signup") return <SafeAreaView style={[styles.auth, styles.formScreen]}>
    <View style={styles.formTopBar}><TouchableOpacity accessibilityRole="button" onPress={() => setScreen("start")} style={styles.formBack}><Text style={styles.back}>‹</Text></TouchableOpacity><Text style={styles.formTitle}>회원가입</Text><View style={styles.formBack} /></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
      <SeugiTextField label="이름" placeholder="이름을 입력해 주세요" containerStyle={styles.signupField} value={name} onChangeText={onNameChange} />
      <SeugiTextField label="이메일" placeholder="이메일 입력해 주세요" autoCapitalize="none" keyboardType="email-address" returnKeyType="next" containerStyle={styles.signupField} value={email} onChangeText={onEmailChange} />
      <SeugiPasswordTextField label="비밀번호" placeholder="비밀번호 입력해 주세요" containerStyle={styles.signupField} value={password} onChangeText={onPasswordChange} />
      <SeugiPasswordTextField label="비밀번호 확인" placeholder="비밀번호를 다시 입력해 주세요" containerStyle={styles.signupField} value={confirmPassword} onChangeText={onConfirmPasswordChange} />
      {confirmPassword && password !== confirmPassword ? <Text style={styles.error}>비밀번호가 다릅니다</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
    <View style={styles.formFooter}>
      <TouchableOpacity accessibilityRole="button" onPress={() => setScreen("login")} style={styles.existingAccount}><Text style={styles.link}>이미 계정이 있으신가요?</Text></TouchableOpacity>
      <Button label="계속하기" onPress={() => { onError(""); setScreen("verification"); }} disabled={!email || !name || password.length < 8 || !confirmPassword || password !== confirmPassword || loading} />
    </View>
  </SafeAreaView>;
  if (screen === "verification") return <SafeAreaView style={[styles.auth, styles.formScreen]}>
    <View style={styles.formTopBar}><TouchableOpacity accessibilityRole="button" onPress={() => setScreen("signup")} style={styles.formBack}><Text style={styles.back}>‹</Text></TouchableOpacity><Text style={styles.formTitle}>이메일 인증</Text><View style={styles.formBack} /></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
      <SeugiCodeTextField label="인증코드" value={code} limit={6} onChangeText={(value) => onCodeChange(value.replace(/\D/g, ""))} error={!!error} containerStyle={styles.codeField} keyboardType="number-pad" />
      <View style={styles.resendRow}>{verificationWaiting ? <Text style={styles.hint}>{Math.floor(verificationSeconds / 60)}분 {String(verificationSeconds % 60).padStart(2, "0")}초 남음</Text> : <TouchableOpacity accessibilityRole="button" disabled={loading} onPress={async () => { if (await onSendVerification()) { setVerificationSeconds(300); setVerificationWaiting(true); } }}><Text style={styles.link}>{loading ? "전송 중…" : "인증 코드 전송"}</Text></TouchableOpacity>}</View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
    <View style={styles.formFooter}><Button label={loading ? "가입 중…" : "계속하기"} onPress={onRegister} disabled={loading || code.length < 6 || !password || !name} /></View>
  </SafeAreaView>;
  return <SafeAreaView style={styles.auth}>
    {screen !== "start" ? <TouchableOpacity accessibilityRole="button" onPress={() => setScreen("start")}><Text style={styles.back}>‹ 뒤로</Text></TouchableOpacity> : null}
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
  </SafeAreaView>;
}

const styles = StyleSheet.create({ auth: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: SeugiColor.Primary050 }, formScreen: { justifyContent: "flex-start", padding: 0, backgroundColor: SeugiColor.White }, formTopBar: { height: 52, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, formBack: { width: 40, minHeight: 40, justifyContent: "center" }, formTitle: { color: SeugiColor.Gray800, fontSize: 18, fontWeight: "700" }, formContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 16 }, formFooter: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, backgroundColor: SeugiColor.White }, signupField: { marginBottom: 16 }, codeField: { marginBottom: 8 }, resendRow: { alignItems: "flex-end", minHeight: 40 }, existingAccount: { alignItems: "center", paddingVertical: 4 }, logo: { color: SeugiColor.Primary500, fontWeight: "800", fontSize: 36, textAlign: "center" }, subtitle: { textAlign: "center", color: SeugiColor.Gray600, marginVertical: 24 }, inputSpacing: { marginBottom: 10 }, error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" }, back: { color: SeugiColor.Gray700, fontSize: 24 }, link: { textAlign: "center", color: SeugiColor.Primary500, marginTop: 18 }, hint: { color: SeugiColor.Gray600, fontSize: 14 }, actions: { gap: 10, marginTop: 12 } });
