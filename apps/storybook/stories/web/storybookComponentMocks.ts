/** Default props for auto-generated web component stories (no API / router required). */
const noop = () => undefined;
const noopAsync = async () => undefined;

export const defaultComponentStoryProps: Record<string, unknown> = {
  onClose: noop,
  onCancel: noop,
  onBack: noop,
  onSave: noop,
  onChange: noop,
  onKeyDown: noop,
  onSelect: noop,
  onCreateRoom: noop,
  onNameChange: noop,
  mutateNotifications: noopAsync,
  handleChatRoomClick: noop,
  value: "",
  date: "2025-10-08",
  chatRooms: [],
  messages: [],
  currentUser: "demo-user",
  workspaces: [],
  pendingWorkspaces: [],
  notifications: [],
  notificationId: "notice-demo",
  userId: "user-demo",
  isOpened: true,
  setIsOpened: noop,
  fileCompletion: {},
  content: "스기",
  text: "스기",
  room: {
    roomId: "room-demo",
    roomName: "플레이그라운드",
    roomType: "group",
    workspaceId: "ws-demo",
  },
  message: {
    messageId: "msg-demo",
    roomId: "room-demo",
    senderMemberId: "member-demo",
    content: "안녕하세요",
    createdAt: new Date().toISOString(),
  },
  chatRoom: {
    roomId: "room-demo",
    roomName: "플레이그라운드",
    roomType: "group",
    workspaceId: "ws-demo",
  },
};

const SLUG_ARGS: Record<string, Record<string, unknown>> = {
  "Alert/Alert": { position: "top-right", subtext: "Storybook demo", titletext: "Alert" },
  "common/TextField/TextField": { value: "스기" },
};

export function withDefaultStoryProps(slug: string, args: Record<string, unknown>) {
  return { ...defaultComponentStoryProps, ...(SLUG_ARGS[slug] ?? {}), ...args };
}
