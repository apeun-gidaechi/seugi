import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, BackHandler, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { SeugiColor } from "@seugi/design-tokens";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { Button } from "../components/ui";
import { SeugiButton } from "../design-system/Button";
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

type AuthRoute = "start" | "login" | "signup" | "verification";

export function AuthScreen({ hydrated, appleAvailable, loading, error, email, password, confirmPassword, name, code, onEmailChange, onPasswordChange, onConfirmPasswordChange, onNameChange, onCodeChange, onGoogleCode, onAppleSignIn, onError, onSendVerification, onLogin, onRegister }: AuthScreenProps) {
  const [routeStack, setRouteStack] = useState<AuthRoute[]>(["start"]);
  const screen = routeStack[routeStack.length - 1];
  const navigate = (route: AuthRoute) => setRouteStack((current) => [...current, route]);
  const goBack = useCallback(() => setRouteStack((current) => current.length > 1 ? current.slice(0, -1) : current), []);
  const [showSignInOptions, setShowSignInOptions] = useState(false);
  const [verificationWaiting, setVerificationWaiting] = useState(false);
  const [verificationSeconds, setVerificationSeconds] = useState(300);
  const leaveVerification = useCallback(() => {
    onCodeChange("");
    onError("");
    goBack();
  }, [goBack, onCodeChange, onError]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (showSignInOptions) { setShowSignInOptions(false); return true; }
      if (screen === "start") return false;
      if (screen === "verification") leaveVerification();
      else goBack();
      return true;
    });
    return () => subscription.remove();
  }, [screen, showSignInOptions, leaveVerification, goBack]);
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
    <View style={styles.formTopBar}><TouchableOpacity accessibilityRole="button" onPress={goBack} style={styles.formBack}><Text style={styles.back}>‹</Text></TouchableOpacity><Text style={styles.formTitle}>회원가입</Text><View style={styles.formBack} /></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
      <SeugiTextField label="이름" placeholder="이름을 입력해 주세요" containerStyle={styles.signupField} value={name} onChangeText={onNameChange} />
      <SeugiTextField label="이메일" placeholder="이메일 입력해 주세요" autoCapitalize="none" keyboardType="email-address" returnKeyType="next" containerStyle={styles.signupField} value={email} onChangeText={onEmailChange} />
      <SeugiPasswordTextField label="비밀번호" placeholder="비밀번호 입력해 주세요" containerStyle={styles.signupField} value={password} onChangeText={onPasswordChange} />
      <SeugiPasswordTextField label="비밀번호 확인" placeholder="비밀번호를 다시 입력해 주세요" containerStyle={styles.signupField} value={confirmPassword} onChangeText={onConfirmPasswordChange} />
      {confirmPassword && password !== confirmPassword ? <Text style={styles.error}>비밀번호가 다릅니다</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
    <View style={styles.formFooter}>
      <TouchableOpacity accessibilityRole="button" onPress={() => navigate("login")} style={styles.existingAccount}><Text style={styles.link}>이미 계정이 있으신가요?</Text></TouchableOpacity>
      <Button label="계속하기" onPress={() => { onError(""); navigate("verification"); }} disabled={!email || !name || !password || !confirmPassword || password !== confirmPassword || loading} />
    </View>
  </SafeAreaView>;
  if (screen === "verification") return <SafeAreaView style={[styles.auth, styles.formScreen]}>
    <View style={styles.formTopBar}><TouchableOpacity accessibilityRole="button" onPress={leaveVerification} style={styles.formBack}><Text style={styles.back}>‹</Text></TouchableOpacity><Text style={styles.formTitle}>이메일 인증</Text><View style={styles.formBack} /></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
      <SeugiCodeTextField label="인증코드" value={code} limit={6} onChangeText={(value) => onCodeChange(value.replace(/\D/g, ""))} error={!!error} containerStyle={styles.codeField} keyboardType="number-pad" />
      <View style={styles.resendRow}>{verificationWaiting ? <Text style={styles.hint}>{Math.floor(verificationSeconds / 60)}분 {String(verificationSeconds % 60).padStart(2, "0")}초 남음</Text> : <TouchableOpacity accessibilityRole="button" disabled={loading} onPress={async () => { if (await onSendVerification()) { setVerificationSeconds(300); setVerificationWaiting(true); } }}><Text style={styles.link}>{loading ? "전송 중…" : "인증 코드 전송"}</Text></TouchableOpacity>}</View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
    <View style={styles.formFooter}><Button label={loading ? "가입 중…" : "계속하기"} onPress={onRegister} disabled={loading || code.length < 6 || !password || !name} /></View>
  </SafeAreaView>;
  if (screen === "start") return <SafeAreaView style={styles.startScreen}>
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs><LinearGradient id="startBackground" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#1C8DF4" /><Stop offset="1" stopColor="#21B6E5" /></LinearGradient></Defs>
      <Path d="M0 0H100V100H0z" fill="url(#startBackground)" />
    </Svg>
    <View style={styles.startCloudTop}>
      <Svg width={214} height={216} viewBox="0 0 214 216">
        <Path d="M175.59 143.79C170.04 145.15 164.23 145.87 158.26 145.87C117.98 145.87 85.33 113.21 85.33 72.93C85.33 32.65 117.98 0 158.26 0C191.4 0 219.38 22.11 228.26 52.38C233.81 51.03 239.62 50.31 245.59 50.31C285.87 50.31 318.52 82.96 318.52 123.24C318.52 163.52 285.87 196.18 245.59 196.18C212.45 196.18 184.46 174.07 175.59 143.79Z" fill="#DAE8FF" />
        <Path d="M175.59 143.79C170.04 145.15 164.23 145.87 158.26 145.87C117.98 145.87 85.33 113.21 85.33 72.93C85.33 32.65 117.98 0 158.26 0C191.4 0 219.38 22.11 228.26 52.38C233.81 51.03 239.62 50.31 245.59 50.31C285.87 50.31 318.52 82.96 318.52 123.24C318.52 163.52 285.87 196.18 245.59 196.18C212.45 196.18 184.46 174.07 175.59 143.79Z" fill="#00C2FF" opacity={0.2} />
        <Circle cx={130.5} cy={97.5} r={55.5} fill="#FFC700" />
        <Path d="M128.82 194.69C141.54 194.69 153.24 190.28 162.45 182.89C170.28 193.85 183.1 200.98 197.58 200.98C207.78 200.98 217.15 197.45 224.54 191.53C232.62 197.47 242.6 200.98 253.41 200.98C280.36 200.98 302.22 179.13 302.22 152.17C302.22 125.21 280.36 103.36 253.41 103.36C239.06 103.36 226.16 109.55 217.23 119.41C211.33 116.39 204.66 114.69 197.58 114.69C190.6 114.69 184.01 116.35 178.17 119.29C169.86 100.28 150.89 87 128.82 87C108.39 87 90.62 98.37 81.5 115.13C73.41 110.28 63.96 107.5 53.85 107.5C24.11 107.5 0 131.6 0 161.34C0 191.08 24.11 215.19 53.85 215.19C74.27 215.19 92.04 203.82 101.16 187.06C109.25 191.9 118.71 194.69 128.82 194.69Z" fill="#F2F7FF" />
      </Svg>
    </View>
    <View style={styles.startCopy}><Text style={styles.startLogo}>스기</Text><Text style={styles.startSubtitle}>학생, 선생님 모두 함께하는{"\n"}스마트 스쿨 플랫폼</Text></View>
    <View style={styles.startCloudBottom}>
      <Svg width={315} height={192} viewBox="0 0 315 192">
        <Path d="M43.57 126.37C30.55 138.47 13.11 145.87 -6.07 145.87C-46.35 145.87 -79 113.21 -79 72.93C-79 32.65 -46.35 0 -6.07 0C20.58 0 43.9 14.29 56.62 35.64C69.64 23.54 87.09 16.14 106.26 16.14C146.54 16.14 179.19 48.79 179.19 89.07C179.19 129.35 146.54 162 106.26 162C79.61 162 56.3 147.71 43.57 126.37Z" fill="#DAE8FF" />
        <Path d="M140.82 170.69C153.54 170.69 165.24 166.28 174.45 158.89C182.28 169.85 195.1 176.98 209.58 176.98C219.78 176.98 229.15 173.45 236.54 167.53C244.62 173.47 254.6 176.98 265.41 176.98C292.36 176.98 314.22 155.13 314.22 128.17C314.22 101.21 292.36 79.36 265.41 79.36C251.06 79.36 238.16 85.55 229.23 95.41C223.33 92.39 216.66 90.69 209.58 90.69C202.6 90.69 196.01 92.35 190.17 95.29C181.86 76.28 162.89 63 140.82 63C120.39 63 102.62 74.37 93.5 91.13C85.41 86.28 75.96 83.5 65.85 83.5C36.11 83.5 12 107.6 12 137.34C12 167.08 36.11 191.19 65.85 191.19C86.27 191.19 104.04 179.82 113.16 163.06C121.25 167.9 130.71 170.69 140.82 170.69Z" fill="#F2F7FF" />
      </Svg>
    </View>
    <SeugiButton label="시작하기" variant="shadow" size="large" fullWidth onPress={() => setShowSignInOptions(true)} style={styles.startButton} />
    {error ? <Text style={styles.startError}>{error}</Text> : null}
    <Modal visible={showSignInOptions} transparent animationType="slide" onRequestClose={() => setShowSignInOptions(false)}>
      <View style={styles.sheetBackdrop}><TouchableOpacity accessibilityRole="button" accessibilityLabel="닫기" style={styles.sheetDismiss} onPress={() => setShowSignInOptions(false)} /><View style={styles.signInSheet}>
        <SeugiButton label="이메일로 계속하기" variant="black" size="large" fullWidth onPress={() => { setShowSignInOptions(false); navigate("login"); }} />
        {appleAvailable ? <AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN} buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK} cornerRadius={10} style={styles.oauthButton} onPress={() => { setShowSignInOptions(false); void onAppleSignIn(); }} /> : null}
        {Platform.OS !== "web" && GOOGLE_WEB_CLIENT_ID ? <GoogleAuthButton label="Google로 계속하기" onCode={onGoogleCode} onError={onError} disabled={loading} /> : null}
      </View></View>
    </Modal>
  </SafeAreaView>;
  if (screen === "login") return <SafeAreaView style={[styles.auth, styles.formScreen]}>
    <View style={styles.formTopBar}><TouchableOpacity accessibilityRole="button" accessibilityLabel="뒤로" onPress={goBack} style={styles.formBack}><Text style={styles.back}>‹</Text></TouchableOpacity><Text style={styles.formTitle}>로그인</Text><View style={styles.formBack} /></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
      <SeugiTextField label="이메일" placeholder="이메일을 입력해 주세요" autoCapitalize="none" keyboardType="email-address" returnKeyType="next" containerStyle={styles.signupField} value={email} onChangeText={onEmailChange} />
      <SeugiPasswordTextField label="비밀번호" placeholder="비밀번호를 입력해 주세요" containerStyle={styles.signupField} value={password} onChangeText={onPasswordChange} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
    <View style={styles.formFooter}>
      <TouchableOpacity accessibilityRole="button" onPress={() => navigate("signup")} style={styles.existingAccount}><Text style={styles.loginSignupPrompt}>계정이 없으시다면? <Text style={styles.link}>가입하기</Text></Text></TouchableOpacity>
      <Button label={loading ? "로그인 중…" : "로그인"} onPress={onLogin} disabled={loading || !email || !password} />
    </View>
  </SafeAreaView>;
  return <SafeAreaView style={styles.auth}>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ auth: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: SeugiColor.Primary050 }, startScreen: { flex: 1, overflow: "hidden", backgroundColor: "#21B6E5", justifyContent: "space-between", paddingTop: 12, paddingBottom: 16 }, startCloudTop: { height: 216, alignItems: "flex-end", marginRight: -64 }, startCopy: { paddingHorizontal: 24, marginTop: 8 }, startLogo: { color: SeugiColor.White, fontSize: 56, lineHeight: 68, fontWeight: "800" }, startSubtitle: { color: SeugiColor.White, fontSize: 18, lineHeight: 26, fontWeight: "600" }, startCloudBottom: { height: 150, justifyContent: "flex-end", marginLeft: -48, marginTop: -12 }, startButton: { marginHorizontal: 20, marginBottom: 4 }, startError: { color: SeugiColor.White, textAlign: "center", paddingHorizontal: 20 }, sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.28)" }, sheetDismiss: { flex: 1 }, signInSheet: { gap: 8, backgroundColor: SeugiColor.White, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 }, oauthButton: { width: "100%", height: 54, marginBottom: 2 }, formScreen: { justifyContent: "flex-start", padding: 0, backgroundColor: SeugiColor.White }, formTopBar: { height: 52, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, formBack: { width: 40, minHeight: 40, justifyContent: "center" }, formTitle: { color: SeugiColor.Gray800, fontSize: 18, fontWeight: "700" }, formContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 16 }, formFooter: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, backgroundColor: SeugiColor.White }, signupField: { marginBottom: 16 }, codeField: { marginBottom: 8 }, resendRow: { alignItems: "flex-end", minHeight: 40 }, existingAccount: { alignItems: "center", paddingVertical: 4 }, loginSignupPrompt: { color: SeugiColor.Gray600 }, logo: { color: SeugiColor.Primary500, fontWeight: "800", fontSize: 36, textAlign: "center" }, subtitle: { textAlign: "center", color: SeugiColor.Gray600, marginVertical: 24 }, inputSpacing: { marginBottom: 10 }, error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" }, back: { color: SeugiColor.Gray700, fontSize: 24 }, link: { textAlign: "center", color: SeugiColor.Primary500, marginTop: 18 }, hint: { color: SeugiColor.Gray600, fontSize: 14 }, actions: { gap: 10, marginTop: 12 } });
