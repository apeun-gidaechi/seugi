import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
import { DesignSystemCatalogScreen } from "./DesignSystemCatalogScreen";
import { demoImageUri } from "./mockData";
import type { PlaygroundDemoEntry } from "./types";

const buttonVariants: SeugiButtonVariant[] = [
  "primary",
  "black",
  "red",
  "transparent",
  "shadow",
  "gray",
];

function ScrollDemo({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      {children}
    </ScrollView>
  );
}

function ButtonDemo() {
  return (
    <ScrollDemo>
      {buttonVariants.map((variant) => (
        <SeugiButton key={variant} label={variant} variant={variant} onPress={() => undefined} />
      ))}
      <SeugiButton label="Loading" loading onPress={() => undefined} />
    </ScrollDemo>
  );
}

function TextFieldDemo() {
  const [field, setField] = useState("스기");
  const [password, setPassword] = useState("secret");
  const [code, setCode] = useState("AB12");
  const [chat, setChat] = useState("안녕");
  return (
    <ScrollDemo>
      <SeugiTextField value={field} onChangeText={setField} placeholder="Text" />
      <SeugiPasswordTextField value={password} onChangeText={setPassword} placeholder="Password" />
      <SeugiCodeTextField
        value={code}
        onChangeText={setCode}
        label="Code"
        accessibilityLabel="Code"
      />
      <SeugiChatTextField
        value={chat}
        onChangeText={setChat}
        onSendClick={() => undefined}
        onAddClick={() => undefined}
      />
    </ScrollDemo>
  );
}

function AvatarDemo() {
  return (
    <ScrollDemo>
      <SeugiAvatar
        name="스기"
        imageStyle={styles.avatar}
        fallbackStyle={styles.avatarFallback}
        labelStyle={styles.avatarInitial}
      />
    </ScrollDemo>
  );
}

function BadgeDemo() {
  return (
    <ScrollDemo>
      <View style={styles.row}>
        <SeugiBadge />
        <SeugiBadge count={3} />
        <SeugiBadge count={99} />
      </View>
    </ScrollDemo>
  );
}

function CheckboxDemo() {
  const [checked, setChecked] = useState(true);
  return (
    <ScrollDemo>
      <Pressable onPress={() => setChecked((v) => !v)}>
        <SeugiCheckbox checked={checked} />
      </Pressable>
    </ScrollDemo>
  );
}

function ToggleDemo() {
  const [on, setOn] = useState(true);
  return (
    <ScrollDemo>
      <SeugiToggle value={on} onValueChange={setOn} accessibilityLabel="toggle" />
    </ScrollDemo>
  );
}

function SegmentedControlDemo() {
  const [role, setRole] = useState<"student" | "teacher">("student");
  return (
    <ScrollDemo>
      <SeugiSegmentedControl
        value={role}
        options={[
          { value: "student", label: "학생" },
          { value: "teacher", label: "선생님" },
        ]}
        onChange={setRole}
      />
    </ScrollDemo>
  );
}

function TopBarDemo() {
  return (
    <ScrollDemo>
      <SeugiTopBar
        leading={
          <Pressable accessibilityRole="button">
            <SeugiBackIcon />
          </Pressable>
        }
        title={<Text style={styles.topBarTitle}>Title</Text>}
        trailing={<SeugiAddIcon />}
        shadow
      />
    </ScrollDemo>
  );
}

function ListItemDemo() {
  return (
    <ScrollDemo>
      <SeugiListItem title="List item" showChevron onPress={() => undefined} />
    </ScrollDemo>
  );
}

function DividerDemo() {
  return (
    <ScrollDemo>
      <Text style={styles.muted}>Above</Text>
      <SeugiDivider />
      <Text style={styles.muted}>Below</Text>
    </ScrollDemo>
  );
}

function TooltipDemo() {
  return (
    <ScrollDemo>
      <SeugiTooltip text="Tooltip copy" />
    </ScrollDemo>
  );
}

function LoadingIndicatorDemo() {
  return (
    <ScrollDemo>
      <SeugiLoadingIndicator />
    </ScrollDemo>
  );
}

function ShimmerDemo() {
  return (
    <ScrollDemo>
      <SeugiShimmer style={styles.shimmer} />
    </ScrollDemo>
  );
}

function EmptyStateDemo() {
  return (
    <ScrollDemo>
      <SeugiEmptyState title="Nothing here" />
    </ScrollDemo>
  );
}

function BottomNavigationDemo() {
  const [tab, setTab] = useState<SeugiTab>("home");
  return (
    <View style={styles.bottomNavHost}>
      <SeugiBottomNavigation selected={tab} onSelect={setTab} />
    </View>
  );
}

function RoundedCircleImageDemo() {
  return (
    <ScrollDemo>
      <SeugiRoundedCircleImage uri={demoImageUri} size="large" />
    </ScrollDemo>
  );
}

function BackIconDemo() {
  return (
    <ScrollDemo>
      <SeugiBackIcon />
    </ScrollDemo>
  );
}

function AddIconDemo() {
  return (
    <ScrollDemo>
      <View style={styles.row}>
        <SeugiAddIcon />
        <SeugiAddFillIcon />
      </View>
    </ScrollDemo>
  );
}

function SearchIconDemo() {
  return (
    <ScrollDemo>
      <SeugiSearchIcon />
    </ScrollDemo>
  );
}

function CalendarIconDemo() {
  return (
    <ScrollDemo>
      <SeugiCalendarIcon />
    </ScrollDemo>
  );
}

function ChatAttachmentIconDemo() {
  return (
    <ScrollDemo>
      <View style={styles.row}>
        <SeugiChatAttachmentIcon kind="image" />
        <SeugiChatAttachmentIcon kind="file" />
      </View>
    </ScrollDemo>
  );
}

function NativeIndicatorsDemo() {
  return (
    <ScrollDemo>
      <View style={styles.row}>
        <SeugiChevronRight size={24} color={SeugiColor.Gray500} />
        <SeugiCrownIcon />
      </View>
    </ScrollDemo>
  );
}

function HomeCardIconDemo() {
  return (
    <ScrollDemo>
      <View style={styles.row}>
        {(["school", "meal", "timetable", "task", "schedule", "cat"] as const).map((name) => (
          <SeugiHomeCardIcon key={name} name={name} />
        ))}
      </View>
    </ScrollDemo>
  );
}

function ProfileIconsDemo() {
  return (
    <ScrollDemo>
      <View style={styles.row}>
        <SeugiProfileEditIcon />
        <SeugiProfileSettingsIcon />
      </View>
    </ScrollDemo>
  );
}

function ChatNotificationToggleDemo() {
  const [on, setOn] = useState(true);
  return (
    <ScrollDemo>
      <ChatNotificationToggle enabled={on} onToggle={() => setOn((v) => !v)} />
    </ScrollDemo>
  );
}

export const designSystemDemos: PlaygroundDemoEntry[] = [
  {
    id: "full-catalog",
    title: "Full catalog (scroll)",
    subtitle: "All primitives on one screen",
    group: "Catalog",
    Component: DesignSystemCatalogScreen,
  },
  {
    id: "button",
    title: "Button",
    group: "Inputs",
    Component: ButtonDemo,
  },
  {
    id: "text-field",
    title: "TextField",
    group: "Inputs",
    Component: TextFieldDemo,
  },
  {
    id: "avatar",
    title: "Avatar",
    group: "Display",
    Component: AvatarDemo,
  },
  {
    id: "badge",
    title: "Badge",
    group: "Display",
    Component: BadgeDemo,
  },
  {
    id: "checkbox",
    title: "Checkbox",
    group: "Inputs",
    Component: CheckboxDemo,
  },
  {
    id: "toggle",
    title: "Toggle",
    group: "Inputs",
    Component: ToggleDemo,
  },
  {
    id: "segmented-control",
    title: "SegmentedControl",
    group: "Inputs",
    Component: SegmentedControlDemo,
  },
  {
    id: "top-bar",
    title: "TopBar",
    group: "Layout",
    Component: TopBarDemo,
  },
  {
    id: "list-item",
    title: "ListItem",
    group: "Layout",
    Component: ListItemDemo,
  },
  {
    id: "divider",
    title: "Divider",
    group: "Layout",
    Component: DividerDemo,
  },
  {
    id: "tooltip",
    title: "Tooltip",
    group: "Display",
    Component: TooltipDemo,
  },
  {
    id: "loading-indicator",
    title: "LoadingIndicator",
    group: "Feedback",
    Component: LoadingIndicatorDemo,
  },
  {
    id: "shimmer",
    title: "Shimmer",
    group: "Feedback",
    Component: ShimmerDemo,
  },
  {
    id: "empty-state",
    title: "EmptyState",
    group: "Feedback",
    Component: EmptyStateDemo,
  },
  {
    id: "bottom-navigation",
    title: "BottomNavigation",
    group: "Navigation",
    Component: BottomNavigationDemo,
  },
  {
    id: "rounded-circle-image",
    title: "RoundedCircleImage",
    group: "Display",
    Component: RoundedCircleImageDemo,
  },
  {
    id: "back-icon",
    title: "BackIcon",
    group: "Icons",
    Component: BackIconDemo,
  },
  {
    id: "add-icon",
    title: "AddIcon",
    group: "Icons",
    Component: AddIconDemo,
  },
  {
    id: "search-icon",
    title: "SearchIcon",
    group: "Icons",
    Component: SearchIconDemo,
  },
  {
    id: "calendar-icon",
    title: "CalendarIcon",
    group: "Icons",
    Component: CalendarIconDemo,
  },
  {
    id: "chat-attachment-icon",
    title: "ChatAttachmentIcon",
    group: "Icons",
    Component: ChatAttachmentIconDemo,
  },
  {
    id: "native-indicators",
    title: "NativeIndicators",
    group: "Icons",
    Component: NativeIndicatorsDemo,
  },
  {
    id: "home-card-icon",
    title: "HomeCardIcon",
    group: "Icons",
    Component: HomeCardIconDemo,
  },
  {
    id: "profile-icons",
    title: "ProfileIcons",
    group: "Icons",
    Component: ProfileIconsDemo,
  },
  {
    id: "chat-notification-toggle",
    title: "ChatNotificationToggle",
    group: "Chat",
    Component: ChatNotificationToggleDemo,
  },
];

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  muted: { color: SeugiColor.Gray600 },
  topBarTitle: { fontSize: 17, fontWeight: "600", color: SeugiColor.Gray800, textAlign: "center" },
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
  bottomNavHost: { flex: 1, justifyContent: "flex-end", backgroundColor: SeugiColor.White },
});
