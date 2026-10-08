import { Platform, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../../components/ui";
import { SeugiPasswordTextField, SeugiTextField } from "../../design-system/TextField";
import { SeugiBackIcon } from "../../design-system/BackIcon";
import { authStyles as styles } from "../authStyles";
import { authPrimaryButtonProps } from "../../utils/authButton";

export function EmailLoginScreen({ email, password, error, loading, onEmailChange, onPasswordChange, onBack, onSignup, onLogin }: {
  email: string; password: string; error: string; loading: boolean; onEmailChange: (value: string) => void; onPasswordChange: (value: string) => void; onBack: () => void; onSignup: () => void; onLogin: () => void;
}) {
  return <SafeAreaView style={[styles.auth, styles.formScreen]}><View style={styles.formTopBar}><TouchableOpacity accessibilityRole="button" accessibilityLabel="뒤로" onPress={onBack} style={styles.formBack}><SeugiBackIcon /></TouchableOpacity><Text style={styles.formTitle}>로그인</Text><View style={styles.formBack} /></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}><SeugiTextField label="이메일" placeholder="이메일을 입력해 주세요" autoCapitalize="none" keyboardType="email-address" returnKeyType="next" clearable containerStyle={styles.signupField} value={email} onChangeText={onEmailChange} /><SeugiPasswordTextField label="비밀번호" placeholder="비밀번호를 입력해 주세요" containerStyle={styles.signupField} value={password} onChangeText={onPasswordChange} />{error ? <Text style={styles.error}>{error}</Text> : null}</ScrollView><View style={styles.formFooter}><TouchableOpacity accessibilityRole="button" onPress={onSignup} style={styles.existingAccount}><Text style={styles.loginSignupPrompt}>계정이 없으시다면? <Text style={styles.link}>가입하기</Text></Text></TouchableOpacity><Button label="로그인" onPress={onLogin} disabled={loading || !email || !password} loading={loading} {...authPrimaryButtonProps(Platform.OS === "ios" ? "ios" : "android")} /></View></SafeAreaView>;
}
