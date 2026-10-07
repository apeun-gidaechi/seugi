import type { ChatMessage } from "./index.js";

export interface ChatMessageInput {
  roomId: string;
  message: string;
  files?: string[];
  mention?: Array<string | number>;
  mentionAll?: boolean;
}

export interface ChatMessageAck {
  message: string;
  data?: ChatMessage;
}

export interface ChatMessageDeletedEvent {
  roomId: string;
  messageId: string;
  senderId: string;
}

export interface ChatMessageEmojiEvent {
  roomId: string;
  messageId: string;
  senderId: string;
  emoji: string;
  action: "ADD" | "REMOVE";
}

export interface ClientToServerEvents {
  "room:join": (roomId: string) => void;
  "chat:message": (input: ChatMessageInput, acknowledge?: (result: ChatMessageAck) => void) => void;
}

export interface ServerToClientEvents {
  "chat:message": (message: ChatMessage) => void;
  "chat:message-deleted": (event: ChatMessageDeletedEvent) => void;
  "chat:message-emoji": (event: ChatMessageEmojiEvent) => void;
}
