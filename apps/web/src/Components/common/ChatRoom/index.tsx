export interface UserInfo {
  id: number;
  email: string;
  name: string;
  picture: string;
}

/** Legacy chat-room shape consumed by the retained desktop composer UI. */
export interface ChatRoom {
  id: string;
  workspaceId: string;
  type: string;
  roomAdmin: number;
  chatName: string;
  chatRoomImg: string;
  createdAt: string;
  chatStatusEnum: string;
  joinUserInfo: Array<{ userInfo: UserInfo; timestamp: string }>;
  lastMessage: string;
  lastMessageTimestamp: string;
  notReadCnt: number;
}
