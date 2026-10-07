export type MessageType =
  | "MESSAGE"
  | "IMG"
  | "FILE"
  | "ENTER"
  | "LEFT"
  | "TRANFER_ADMIN"
  | "SUB"
  | "UNSUB"
  | "DELETE_MESSAGE"
  | "ADD_EMOJI"
  | "REMOVE_EMOJI"
  | "BOT";

export type MessageStatus = "ALIVE" | "DELETE";

export interface Message {
  id?: string;
  chatRoomId?: string;
  type?: MessageType;
  userId: string;
  message: string;
  uuid: string;
  emojiList?: Array<{ emojiId: number; userId: string[] }>;
  mention: Array<string | number>;
  mentionAll: boolean;
  timestamp?: string;
  messageStatus?: MessageStatus;
  eventList: number[];
  emoticon?: string;
  files?: string[];
}
