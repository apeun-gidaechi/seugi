import type { ChatMessage } from "./index.js";

export interface ChatMessageInput {
  roomId: string;
  message: string;
  type?: "MESSAGE" | "IMG" | "FILE";
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
  "room:join": (roomId: string, acknowledge?: (joined: boolean) => void) => void;
  "room:leave": (roomId: string, acknowledge?: () => void) => void;
  "chat:message": (input: ChatMessageInput, acknowledge?: (result: ChatMessageAck) => void) => void;
}

export interface ServerToClientEvents {
  "chat:message": (message: ChatMessage) => void;
  "chat:message-deleted": (event: ChatMessageDeletedEvent) => void;
  "chat:message-emoji": (event: ChatMessageEmojiEvent) => void;
}
