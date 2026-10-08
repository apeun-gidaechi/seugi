import { Platform, StyleSheet, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import { SeugiButton } from "../design-system/Button";
import { SeugiCodeTextField } from "../design-system/TextField";

/** Code-entry destination; the parent coordinator retains role and result state. */
export function WorkspaceJoinCodeScreen({ code, busy, onChangeCode, onContinue }: {
  code: string;
  busy: boolean;
  onChangeCode: (value: string) => void;
  onContinue: () => void;
}) {
  return <View style={styles.form}>
    <SeugiCodeTextField
      value={code}
      onChangeText={onChangeCode}
      keyboardType="default"
      autoFocus={Platform.OS === "ios"}
      autoCapitalize="characters"
      autoCorrect={false}
      accessibilityLabel="학교 코드"
      label={Platform.OS === "ios" ? "초대코드" : "학교 코드"}
    />
    <View style={styles.spacer} />
    <SeugiButton
      label="계속하기"
      onPress={onContinue}
      size={Platform.OS === "ios" ? "large" : "small"}
      fullWidth
      loading={busy}
      disabled={code.length !== 6 || busy}
      style={styles.continueButton}
    />
  </View>;
}

const styles = StyleSheet.create({
  form: { flex: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, backgroundColor: SeugiColor.White },
  spacer: { flex: 1 },
  continueButton: { marginBottom: Platform.OS === "ios" ? 0 : 10 },
});
