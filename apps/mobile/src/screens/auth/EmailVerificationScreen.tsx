import { Platform, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Button } from "../../components/ui";
import { SeugiCodeTextField } from "../../design-system/TextField";
import { SeugiBackIcon } from "../../design-system/BackIcon";
import { authStyles as styles } from "../authStyles";
import { authPrimaryButtonProps } from "../../utils/authButton";
import { nativePlatform } from "../../utils/platform";

export function EmailVerificationScreen({
  code,
  error,
  loading,
  password,
  name,
  waiting,
  seconds,
  onCodeChange,
  onBack,
  onSend,
  onRegister,
}: {
  code: string;
  error: string;
  loading: boolean;
  password: string;
  name: string;
  waiting: boolean;
  seconds: number;
  onCodeChange: (value: string) => void;
  onBack: () => void;
  onSend: () => Promise<void>;
  onRegister: () => void | Promise<void>;
}) {
  return (
    <SafeAreaView style={[styles.auth, styles.formScreen]}>
      <View style={styles.formTopBar}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="뒤로"
          onPress={onBack}
          style={styles.formBack}
        >
          <SeugiBackIcon />
        </TouchableOpacity>
        <Text style={styles.formTitle}>이메일 인증</Text>
        <View style={styles.formBack} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
        <SeugiCodeTextField
          label="인증코드"
          value={code}
          limit={6}
          onChangeText={(value) => onCodeChange(value.replace(/\D/g, ""))}
          error={!!error}
          containerStyle={styles.codeField}
          keyboardType="number-pad"
        />
        <View style={styles.resendRow}>
          {waiting ? (
            <Text style={styles.hint}>
              {Math.floor(seconds / 60)}분 {String(seconds % 60).padStart(2, "0")}초 남음
            </Text>
          ) : (
            <TouchableOpacity
              accessibilityRole="button"
              disabled={loading}
              onPress={() => void onSend()}
            >
              <Text style={styles.link}>{loading ? "전송 중…" : "인증 코드 전송"}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      <View style={styles.formFooter}>
        <Button
          label="계속하기"
          onPress={onRegister}
          disabled={loading || code.length < 6 || !password || !name}
          loading={loading}
          {...authPrimaryButtonProps(nativePlatform())}
        />
      </View>
    </SafeAreaView>
  );
}
