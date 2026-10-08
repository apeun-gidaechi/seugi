import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SeugiColor } from "@seugi/design-tokens";
import { HomeCard } from "../components/HomeCard";
import { HomeAssignmentsCard } from "../components/HomeAssignmentsCard";
import { WorkspaceRoleSelection } from "../components/WorkspaceRoleSelection";
import { WorkspaceJoinConfirmation } from "../components/WorkspaceJoinConfirmation";
import { ZoomableImage } from "../components/ZoomableImage";
import { GoogleAuthButton } from "../components/GoogleAuthButton";
import { ChatRoomManagement } from "../components/ChatRoomManagement";
import { Card, Button } from "../components/ui";
import { demoImageUri, mockRoom, mockWorkspace } from "./mockData";
import type { PlaygroundDemoEntry } from "./types";

function ScrollDemo({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      {children}
    </ScrollView>
  );
}

function HomeCardDemo() {
  return (
    <ScrollDemo>
      <HomeCard title="급식" icon="meal" onPress={() => undefined}>
        <Text style={styles.muted}>오늘의 메뉴 미리보기</Text>
      </HomeCard>
      <HomeCard title="캣스기" icon="cat">
        <Text style={styles.muted}>캣스기 카드</Text>
      </HomeCard>
    </ScrollDemo>
  );
}

function HomeAssignmentsCardDemo() {
  return (
    <ScrollDemo>
      <HomeAssignmentsCard
        tasks={[]}
        classroomTasks={[]}
        loading={false}
        error={false}
        onOpen={() => undefined}
      />
      <HomeAssignmentsCard
        tasks={[]}
        classroomTasks={[]}
        loading={true}
        error={false}
        onOpen={() => undefined}
      />
    </ScrollDemo>
  );
}

function WorkspaceRoleSelectionDemo() {
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  return (
    <ScrollDemo>
      <WorkspaceRoleSelection value={role} onChange={setRole} onContinue={() => undefined} />
    </ScrollDemo>
  );
}

function WorkspaceJoinConfirmationDemo() {
  return (
    <ScrollDemo>
      <WorkspaceJoinConfirmation
        workspace={{
          workspaceId: mockWorkspace.id,
          workspaceName: mockWorkspace.name,
          workspaceImageUrl: "",
          studentCount: 120,
          teacherCount: 12,
        }}
        busy={false}
        onContinue={() => undefined}
      />
    </ScrollDemo>
  );
}

function ZoomableImageDemo() {
  return (
    <View style={styles.zoom}>
      <ZoomableImage uri={demoImageUri} accessibilityLabel="확대 이미지 데모" />
    </View>
  );
}

function UiPrimitivesDemo() {
  return (
    <ScrollDemo>
      <Card title="Card" onPress={() => undefined}>
        <Text style={styles.muted}>Card body</Text>
      </Card>
      <Button label="ui.Button" onPress={() => undefined} />
    </ScrollDemo>
  );
}

function ChatRoomManagementDemo() {
  return (
    <View style={styles.flex}>
      <ChatRoomManagement
        room={mockRoom}
        memberId="member-1"
        notificationEnabled={true}
        onNotificationToggle={noop}
        onRoomChange={noop}
        onClose={noop}
        onLeave={noop}
        onOpenPersonalChat={noop}
      />
    </View>
  );
}

const noop = () => undefined;

function GoogleAuthButtonDemo() {
  return (
    <ScrollDemo>
      <Text style={styles.muted}>Requires Google OAuth client configuration.</Text>
      <GoogleAuthButton
        label="Google로 계속"
        configured={false}
        onCode={async () => undefined}
        onError={() => undefined}
      />
    </ScrollDemo>
  );
}

export const componentDemos: PlaygroundDemoEntry[] = [
  { id: "home-card", title: "HomeCard", group: "Home", Component: HomeCardDemo },
  {
    id: "home-assignments-card",
    title: "HomeAssignmentsCard",
    group: "Home",
    Component: HomeAssignmentsCardDemo,
  },
  {
    id: "workspace-role-selection",
    title: "WorkspaceRoleSelection",
    group: "Workspace",
    Component: WorkspaceRoleSelectionDemo,
  },
  {
    id: "workspace-join-confirmation",
    title: "WorkspaceJoinConfirmation",
    group: "Workspace",
    Component: WorkspaceJoinConfirmationDemo,
  },
  { id: "zoomable-image", title: "ZoomableImage", group: "Media", Component: ZoomableImageDemo },
  {
    id: "ui-primitives",
    title: "Card · Button (ui)",
    group: "Primitives",
    Component: UiPrimitivesDemo,
  },
  {
    id: "google-auth-button",
    title: "GoogleAuthButton",
    group: "Auth",
    subtitle: "Needs EXPO_PUBLIC_GOOGLE_* env",
    Component: GoogleAuthButtonDemo,
  },
  {
    id: "chat-room-management",
    title: "ChatRoomManagement",
    group: "Chat",
    Component: ChatRoomManagementDemo,
  },
];

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: SeugiColor.Primary050 },
  scrollContent: { padding: 16, gap: 12 },
  muted: { color: SeugiColor.Gray600, fontSize: 14 },
  zoom: { flex: 1, backgroundColor: SeugiColor.Black },
  flex: { flex: 1, backgroundColor: SeugiColor.Primary050 },
});
