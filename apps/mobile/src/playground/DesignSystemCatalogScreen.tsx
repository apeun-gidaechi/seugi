import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SeugiColor } from "@seugi/design-tokens";
import type { SeugiButtonVariant } from "../design-system/Button";
import { SeugiButton } from "../design-system/Button";
import {
  SeugiChatTextField,
  SeugiCodeTextField,
  SeugiPasswordTextField,
  SeugiTextField,
} from "../design-system/TextField";
import { SeugiAvatar } from "../design-system/Avatar";
import { SeugiBadge } from "../design-system/Badge";
import { SeugiCheckbox } from "../design-system/Checkbox";
import { SeugiDivider } from "../design-system/Divider";
import { SeugiEmptyState } from "../design-system/EmptyState";
import { SeugiListItem } from "../design-system/ListItem";
import { SeugiLoadingIndicator } from "../design-system/LoadingIndicator";
import { SeugiSegmentedControl } from "../design-system/SegmentedControl";
import { SeugiToggle } from "../design-system/Toggle";
import { SeugiBottomNavigation, type SeugiTab } from "../design-system/BottomNavigation";
import { SeugiTopBar } from "../design-system/TopBar";
import { SeugiShimmer } from "../design-system/Shimmer";
import { SeugiTooltip } from "../design-system/Tooltip";
import { ChatNotificationToggle } from "../design-system/ChatNotificationToggle";
import { SeugiRoundedCircleImage } from "../design-system/RoundedCircleImage";
import { SeugiBackIcon } from "../design-system/BackIcon";
import { SeugiAddFillIcon, SeugiAddIcon } from "../design-system/AddIcon";
import { SeugiSearchIcon } from "../design-system/SearchIcon";
import { SeugiCalendarIcon } from "../design-system/CalendarIcon";
import { SeugiChatAttachmentIcon } from "../design-system/ChatAttachmentIcon";
import { SeugiChevronRight, SeugiCrownIcon } from "../design-system/NativeIndicators";
import { SeugiHomeCardIcon } from "../design-system/HomeCardIcon";
import { SeugiProfileEditIcon, SeugiProfileSettingsIcon } from "../design-system/ProfileIcons";
import { nativePlatform } from "../utils/platform";
import { demoImageUri } from "./mockData";

const buttonVariants: SeugiButtonVariant[] = [
  "primary",
  "black",
  "red",
  "transparent",
  "shadow",
  "gray",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function DesignSystemCatalogScreen() {
  const [tab, setTab] = useState<SeugiTab>("home");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [checked, setChecked] = useState(true);
  const [toggle, setToggle] = useState(true);
  const [chatAlerts, setChatAlerts] = useState(true);
  const [field, setField] = useState("스기 디자인 시스템");
  const [password, setPassword] = useState("password");
  const [code, setCode] = useState("AB12CD");
  const [chatDraft, setChatDraft] = useState("안녕하세요");
  const platform = nativePlatform();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 72 }]}>
        <Text style={styles.meta}>
          Platform: {platform} · {buttonVariants.length} button variants
        </Text>

        <Section title="Buttons">
          <View style={styles.row}>
            {buttonVariants.map((variant) => (
              <SeugiButton
                key={variant}
                label={variant}
                variant={variant}
                onPress={() => undefined}
              />
            ))}
          </View>
          <SeugiButton label="Loading" loading onPress={() => undefined} />
          <SeugiButton label="Full width large" size="large" fullWidth onPress={() => undefined} />
        </Section>

        <Section title="Text fields">
          <SeugiTextField value={field} onChangeText={setField} placeholder="Placeholder" />
          <SeugiPasswordTextField
            value={password}
            onChangeText={setPassword}
            placeholder="비밀번호"
          />
          <SeugiCodeTextField
            value={code}
            onChangeText={setCode}
            label="초대코드"
            accessibilityLabel="초대코드"
          />
          <SeugiChatTextField
            value={chatDraft}
            onChangeText={setChatDraft}
            onSendClick={() => undefined}
            onAddClick={() => undefined}
          />
        </Section>

        <Section title="Avatar · Badge · Checkbox · Toggle">
          <View style={styles.row}>
            <SeugiAvatar
              name="스기"
              imageStyle={styles.avatar}
              fallbackStyle={styles.avatarFallback}
              labelStyle={styles.avatarInitial}
            />
            <SeugiBadge />
            <SeugiBadge count={3} />
            <SeugiBadge count={120} />
            <Pressable onPress={() => setChecked((value) => !value)}>
              <SeugiCheckbox checked={checked} />
            </Pressable>
            <SeugiToggle value={toggle} onValueChange={setToggle} accessibilityLabel="알림" />
          </View>
          <SeugiRoundedCircleImage uri={demoImageUri} size="large" />
        </Section>

        <Section title="Segmented control">
          <SeugiSegmentedControl
            value={role}
            options={[
              { value: "student", label: "학생" },
              { value: "teacher", label: "선생님" },
            ]}
            onChange={setRole}
          />
          <SeugiSegmentedControl
            value={role}
            variant="nativeTabs"
            options={[
              { value: "student", label: "학생" },
              { value: "teacher", label: "선생님" },
            ]}
            onChange={setRole}
          />
        </Section>

        <Section title="Top bar">
          <SeugiTopBar
            leading={
              <Pressable accessibilityRole="button" accessibilityLabel="뒤로">
                <SeugiBackIcon />
              </Pressable>
            }
            title={<Text style={styles.topBarTitle}>타이틀</Text>}
            trailing={<SeugiAddIcon />}
            shadow
          />
        </Section>

        <Section title="List · Divider · Tooltip">
          <SeugiListItem title="워크스페이스 설정" showChevron onPress={() => undefined} />
          <SeugiDivider />
          <SeugiListItem title="멤버" showChevron onPress={() => undefined} />
          <SeugiTooltip text="승인 대기 중인 요청이 있습니다" />
        </Section>

        <Section title="Loading · Shimmer · Empty">
          <SeugiLoadingIndicator />
          <SeugiShimmer style={styles.shimmer} />
          <SeugiEmptyState title="공지가 없어요" />
        </Section>

        <Section title="Icons">
          <View style={styles.row}>
            <SeugiBackIcon />
            <SeugiAddIcon />
            <SeugiAddFillIcon />
            <SeugiSearchIcon />
            <SeugiCalendarIcon />
            <SeugiChatAttachmentIcon kind="image" />
            <SeugiChatAttachmentIcon kind="file" />
            <SeugiChevronRight size={24} color={SeugiColor.Gray500} />
            <SeugiCrownIcon />
            <SeugiProfileEditIcon />
            <SeugiProfileSettingsIcon />
            <ChatNotificationToggle
              enabled={chatAlerts}
              onToggle={() => setChatAlerts((v) => !v)}
            />
          </View>
          <View style={styles.row}>
            {(["school", "meal", "timetable", "task", "schedule", "cat"] as const).map((name) => (
              <SeugiHomeCardIcon key={name} name={name} />
            ))}
          </View>
        </Section>
      </ScrollView>
      <View style={[styles.bottomNav, { paddingBottom: bottomInset }]}>
        <SeugiBottomNavigation selected={tab} onSelect={setTab} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SeugiColor.Primary050 },
  content: { padding: 16, gap: 8 },
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SeugiColor.White,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: SeugiColor.Gray300,
  },
  meta: { color: SeugiColor.Gray600, fontSize: 13, marginBottom: 8 },
  section: {
    backgroundColor: SeugiColor.White,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: SeugiColor.Gray800 },
  topBarTitle: { fontSize: 17, fontWeight: "600", color: SeugiColor.Gray800, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  shimmer: { height: 48, borderRadius: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SeugiColor.Primary200,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: SeugiColor.Primary500, fontWeight: "700" },
});
