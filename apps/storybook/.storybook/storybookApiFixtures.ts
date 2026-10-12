import type { ChatMessage } from "@seugi/contracts";

export const STORYBOOK_WORKSPACE_ID = "ws-demo";
export const storybookDemoRoomId = "room-demo";

export const storybookApiRooms = [
  {
    id: storybookDemoRoomId,
    workspaceId: STORYBOOK_WORKSPACE_ID,
    type: "PERSONAL",
    name: "플레이그라운드",
    adminId: "1",
    image: "",
    memberIds: ["storybook-user", "member-demo"],
  },
  {
    id: "room-group-demo",
    workspaceId: STORYBOOK_WORKSPACE_ID,
    type: "GROUP",
    name: "3학년 1반",
    adminId: "1",
    image: "",
    memberIds: ["storybook-user", "member-demo", "member-2"],
  },
];

export function storybookDemoMessages(roomId: string): ChatMessage[] {
  const stamp = new Date().toISOString();
  return [
    {
      id: "msg-demo-1",
      roomId,
      senderId: "member-demo",
      message: "Storybook에서 채팅 UI를 확인할 수 있습니다.",
      createdAt: stamp,
      emojis: {},
      type: "MESSAGE",
    },
    {
      id: "msg-demo-2",
      roomId,
      senderId: "storybook-user",
      message: "안녕하세요!",
      createdAt: stamp,
      emojis: { "👍": ["storybook-user"] },
      type: "MESSAGE",
    },
  ];
}
