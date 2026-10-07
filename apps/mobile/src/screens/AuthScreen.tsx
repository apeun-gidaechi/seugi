import { ActivityIndicator, Platform, SafeAreaView, StyleSheet, Text, TextInput } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { SeugiColor } from "@seugi/design-tokens";
import { Button } from "../components/ui";
import { GoogleAuthButton } from "../components/GoogleAuthButton";
import { GOOGLE_WEB_CLIENT_ID } from "../config";

type AuthScreenProps = {
  hydrated: boolean;
  appleAvailable: boolean;
  loading: boolean;
  error: string;
  email: string;
  password: string;
  name: string;
  code: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onGoogleCode: (code: string) => Promise<void>;
  onAppleSignIn: () => Promise<void>;
  onError: (message: string) => void;
  onSendVerification: () => void;
  onLogin: () => void;
  onRegister: () => void;
};

export function AuthScreen({ hydrated, appleAvailable, loading, error, email, password, name, code, onEmailChange, onPasswordChange, onNameChange, onCodeChange, onGoogleCode, onAppleSignIn, onError, onSendVerification, onLogin, onRegister }: AuthScreenProps) {
  if (!hydrated) return <SafeAreaView style={styles.auth}><ActivityIndicator size="large" color={SeugiColor.Primary500} /><Text style={styles.subtitle}>로그인 정보를 확인하는 중…</Text></SafeAreaView>;
  return <SafeAreaView style={styles.auth}>
    <Text style={styles.logo}>스기</Text><Text style={styles.subtitle}>학교의 모든 소통을 한 곳에서</Text>
    {appleAvailable ? <AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN} buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK} cornerRadius={10} style={{ width: "100%", height: 48, marginBottom: 10 }} onPress={onAppleSignIn} /> : null}
    {Platform.OS !== "web" && GOOGLE_WEB_CLIENT_ID ? <GoogleAuthButton label="Google로 로그인" onCode={onGoogleCode} onError={onError} disabled={loading} /> : null}
    <TextInput placeholder="이메일" autoCapitalize="none" style={styles.input} value={email} onChangeText={onEmailChange} /><TextInput placeholder="비밀번호 (8자 이상)" secureTextEntry style={styles.input} value={password} onChangeText={onPasswordChange} /><TextInput placeholder="이름 (회원가입 시)" style={styles.input} value={name} onChangeText={onNameChange} /><TextInput placeholder="이메일 인증 코드 (회원가입 시)" keyboardType="number-pad" style={styles.input} value={code} onChangeText={onCodeChange} />
    {error ? <Text style={styles.error}>{error}</Text> : null}<Button label="인증 코드 보내기" kind="secondary" onPress={onSendVerification} disabled={!email || loading} /><Button label={loading ? "처리 중…" : "로그인"} onPress={onLogin} disabled={loading} /><Button label="이메일로 회원가입" kind="secondary" onPress={onRegister} disabled={loading} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({ auth: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: SeugiColor.Primary050 }, logo: { color: SeugiColor.Primary500, fontWeight: "800", fontSize: 36, textAlign: "center" }, subtitle: { textAlign: "center", color: SeugiColor.Gray600, marginVertical: 24 }, input: { backgroundColor: SeugiColor.White, borderWidth: 1, borderColor: SeugiColor.Gray300, borderRadius: 10, padding: 13, marginBottom: 10 }, error: { color: SeugiColor.Red500, marginVertical: 8, textAlign: "center" } });
