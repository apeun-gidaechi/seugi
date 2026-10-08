import { Platform, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../../components/ui";
import { SeugiPasswordTextField, SeugiTextField } from "../../design-system/TextField";
import { SeugiBackIcon } from "../../design-system/BackIcon";
import { authStyles as styles } from "../authStyles";
import { authPrimaryButtonProps } from "../../utils/authButton";

export type SignupValidation = "blank_name" | "blank_email" | "invalid_email" | "blank_password" | "different_password";

export function EmailSignupScreen({ name, email, password, confirmPassword, error, loading, validation, onNameChange, onEmailChange, onPasswordChange, onConfirmPasswordChange, onValidationChange, onBack, onLogin, onContinue }: {
  name: string; email: string; password: string; confirmPassword: string; error: string; loading: boolean; validation?: SignupValidation;
  onNameChange: (value: string) => void; onEmailChange: (value: string) => void; onPasswordChange: (value: string) => void; onConfirmPasswordChange: (value: string) => void; onValidationChange: (value?: SignupValidation) => void; onBack: () => void; onLogin: () => void; onContinue: () => void;
}) {
  const advance = () => {
    if (Platform.OS === "android") {
      const nextValidation = name === "" ? "blank_name" : email === "" ? "blank_email" : !email.includes("@") || email.split("@").length !== 2 || email.split("@")[1] === "" ? "invalid_email" : password === "" ? "blank_password" : password !== confirmPassword ? "different_password" : undefined;
      onValidationChange(nextValidation as SignupValidation | undefined);
      if (nextValidation) return;
    }
    onContinue();
  };
  return <SafeAreaView style={[styles.auth, styles.formScreen]}><View style={styles.formTopBar}><TouchableOpacity accessibilityRole="button" accessibilityLabel="뒤로" onPress={onBack} style={styles.formBack}><SeugiBackIcon /></TouchableOpacity><Text style={styles.formTitle}>회원가입</Text><View style={styles.formBack} /></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}><SeugiTextField label="이름" placeholder="이름을 입력해 주세요" clearable containerStyle={styles.signupField} value={name} onChangeText={onNameChange} />{validation === "blank_name" ? <Text style={styles.error}>이름을 입력해 주세요</Text> : null}<SeugiTextField label="이메일" placeholder="이메일 입력해 주세요" autoCapitalize="none" keyboardType="email-address" returnKeyType="next" clearable containerStyle={styles.signupField} value={email} onChangeText={onEmailChange} />{validation === "blank_email" ? <Text style={styles.error}>이메일을 입력해주세요</Text> : null}{validation === "invalid_email" ? <Text style={styles.error}>이메일 형식을 맞춰주세요</Text> : null}<SeugiPasswordTextField label="비밀번호" placeholder="비밀번호 입력해 주세요" containerStyle={styles.signupField} value={password} onChangeText={onPasswordChange} />{validation === "blank_password" ? <Text style={styles.error}>비밀번호를 입력해 주세요</Text> : null}<SeugiPasswordTextField label="비밀번호 확인" placeholder="비밀번호를 다시 입력해 주세요" containerStyle={styles.signupField} value={confirmPassword} onChangeText={onConfirmPasswordChange} />{validation === "different_password" || (confirmPassword && password !== confirmPassword) ? <Text style={styles.error}>비밀번호가 다릅니다</Text> : null}{error ? <Text style={styles.error}>{error}</Text> : null}</ScrollView><View style={styles.formFooter}><TouchableOpacity accessibilityRole="button" onPress={onLogin} style={styles.existingAccount}><Text style={styles.link}>이미 계정이 있으신가요?</Text></TouchableOpacity><Button label="계속하기" onPress={advance} disabled={loading || (Platform.OS === "ios" && (!email || !name || !password || !confirmPassword || password !== confirmPassword))} loading={loading} {...authPrimaryButtonProps(Platform.OS === "ios" ? "ios" : "android")} /></View></SafeAreaView>;
}
