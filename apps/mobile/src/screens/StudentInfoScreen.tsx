import { useEffect, useState } from "react";
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { LegacyProfile, Workspace } from "@seugi/contracts";
import { SeugiColor } from "@seugi/design-tokens";
import { Button } from "../components/ui";
import { api } from "../services/api";
import { authPrimaryButtonProps } from "../utils/authButton";

type StudentInfoScreenProps = {
  visible: boolean;
  workspace: Workspace;
  profile: LegacyProfile;
  onClose: (saved: boolean) => void;
};

/** Student number editor ported from the web workspace member-management dialog. */
export function StudentInfoScreen({ visible, workspace, profile, onClose }: StudentInfoScreenProps) {
  const [grade, setGrade] = useState(profile.schGrade ?? profile.grade ?? 1);
  const [classNum, setClassNum] = useState(profile.schClass ?? profile.class ?? 1);
  const [number, setNumber] = useState(profile.schNumber ?? profile.number ?? 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setGrade(profile.schGrade ?? profile.grade ?? 1);
    setClassNum(profile.schClass ?? profile.class ?? 1);
    setNumber(profile.schNumber ?? profile.number ?? 1);
    setError("");
  }, [visible, profile.member.id, profile.schGrade, profile.grade, profile.schClass, profile.class, profile.schNumber, profile.number]);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api.editStudentNumber(workspace.id, {
        id: profile.member.id,
        schGrade: grade,
        schClass: classNum,
        schNumber: number,
      });
      onClose(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "학생 정보를 수정하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={() => onClose(false)}>
    <View style={styles.backdrop}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="학생 정보 수정 닫기" style={styles.dismiss} onPress={() => onClose(false)} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}><Text style={styles.title}>학생 정보 수정</Text>{Platform.OS === "ios" ? <TouchableOpacity accessibilityRole="button" onPress={() => void save()} disabled={busy}><Text style={[styles.done, busy && styles.doneDisabled]}>수정</Text></TouchableOpacity> : null}</View>
        <NumberPicker label="학년" value={grade} options={[1, 2, 3]} onChange={setGrade} />
        <NumberPicker label="반" value={classNum} options={[1, 2, 3, 4]} onChange={setClassNum} />
        <NumberPicker label="번호" value={number} options={Array.from({ length: 30 }, (_, index) => index + 1)} onChange={setNumber} />
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Button label="수정" onPress={() => void save()} disabled={busy} loading={busy} {...authPrimaryButtonProps(Platform.OS === "ios" ? "ios" : "android")} />
      </View>
    </View>
  </Modal>;
}

function NumberPicker({ label, value, options, onChange }: { label: string; value: number; options: number[]; onChange: (value: number) => void }) {
  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.options}>
      {options.map((option) => <TouchableOpacity key={option} accessibilityRole="radio" accessibilityState={{ selected: option === value }} onPress={() => onChange(option)} style={[styles.option, option === value && styles.optionSelected]}>
        <Text style={[styles.optionText, option === value && styles.optionTextSelected]}>{option}{label === "학년" ? "학년" : label === "반" ? "반" : "번"}</Text>
      </TouchableOpacity>)}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.32)" },
  dismiss: { flex: 1 },
  sheet: { backgroundColor: SeugiColor.White, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 28, gap: 16 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: SeugiColor.Gray300, alignSelf: "center" },
  header: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: SeugiColor.Gray800, fontSize: 18, fontWeight: "700" },
  done: { color: SeugiColor.Primary500, fontSize: 15, fontWeight: "700" },
  doneDisabled: { color: SeugiColor.Gray400 },
  field: { gap: 8 },
  label: { color: SeugiColor.Gray700, fontSize: 14, fontWeight: "600" },
  options: { gap: 8, paddingVertical: 2 },
  option: { minWidth: 58, minHeight: 42, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: SeugiColor.Gray200, alignItems: "center", justifyContent: "center" },
  optionSelected: { borderColor: SeugiColor.Primary500, backgroundColor: SeugiColor.Primary100 },
  optionText: { color: SeugiColor.Gray600, fontSize: 14 },
  optionTextSelected: { color: SeugiColor.Primary500, fontWeight: "700" },
  error: { color: SeugiColor.Red500, textAlign: "center" },
});
