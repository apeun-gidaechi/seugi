import { z } from "zod";
import { CHAT_EMOJIS } from "./constants.js";

export const createChatRoomSchema = z
  .object({
    workspaceId: z.string().uuid(),
    name: z.string().optional(),
    roomName: z.string().optional(),
    memberIds: z.array(z.string().uuid()).optional(),
    joinUsers: z.array(z.string().uuid()).optional(),
    image: z.string().url().optional(),
    chatRoomImg: z.string().url().or(z.literal("")).optional(),
  })
  .refine(
    (input) => input.name !== undefined || input.roomName !== undefined,
    "채팅방 이름이 필요합니다",
  )
  .refine(
    (input) => input.memberIds !== undefined || input.joinUsers !== undefined,
    "참여자가 필요합니다",
  );
export const chatMemberEventSchema = z.object({
  roomId: z.string().uuid(),
  memberIds: z.array(z.string().uuid()),
  memberId: z.string().uuid().optional(),
});
export const chatRoomSearchSchema = z.object({
  workspace: z.string().uuid(),
  word: z.string().default(""),
});
export const messageHistoryQuerySchema = z.object({ timestamp: z.string().optional() });
export const chatEmojiSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.enum(CHAT_EMOJIS),
});
export const deleteMessageSchema = z.object({
  roomId: z.string().uuid(),
  messageId: z.string().uuid(),
});
const chatMessageFields = {
  roomId: z.string().uuid(),
  type: z.enum(["MESSAGE", "IMG", "FILE"]).default("MESSAGE"),
  message: z.string().max(20_000).default(""),
  files: z.array(z.string().min(1).max(2048)).max(10).optional(),
  mention: z
    .array(z.union([z.string(), z.number().int()]))
    .max(100)
    .optional(),
  mentionAll: z.boolean().optional(),
};
const hasMessageContent = (input: { message: string; files?: string[] }) =>
  input.message.length > 0 || !!input.files?.length;
export const chatMessageInputSchema = z.object(chatMessageFields).refine(hasMessageContent);
export const legacyStompChatMessageSchema = z
  .object({
    ...chatMessageFields,
    uuid: z.string().max(128).optional(),
    eventList: z.array(z.number().int()).max(100).optional(),
    emoticon: z.string().max(64).nullable().optional(),
  })
  .refine(hasMessageContent);

export type CreateChatRoomInput = z.input<typeof createChatRoomSchema>;
export type ChatMemberEventInput = z.input<typeof chatMemberEventSchema>;
export type LegacyStompChatMessageInput = z.input<typeof legacyStompChatMessageSchema>;

export type RoomType = "GROUP" | "PERSONAL";

export interface ChatRoomMemberInfo {
  userInfo: { id: string; email: string; name: string; picture?: string; birth: string };
  timestamp: string;
}

/** Normalized plus legacy fields returned by the original Kotlin room DTO. */
export interface Room {
  id: string;
  workspaceId: string;
  type: RoomType;
  name: string;
  memberIds: string[];
  adminId: string;
  image?: string;
  status?: "ALIVE" | "DELETE";
  createdAt?: string;
  memberReadAt?: Record<string, string>;
  lastMessage?: string;
  lastMessageTimestamp?: string | null;
  notReadCnt?: number;
  roomAdmin?: string;
  chatName?: string;
  chatRoomImg?: string;
  chatStatusEnum?: "ACTIVE" | "DELETE";
  joinUserInfo?: ChatRoomMemberInfo[];
}

/** Normalized plus legacy fields carried by message history and realtime DTOs. */
export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  message: string;
  createdAt: string;
  files?: string[];
  emojis: Record<string, string[]>;
  messageStatus?: "ALIVE" | "DELETE";
  chatRoomId?: string;
  type?: "MESSAGE" | "IMG" | "FILE" | "BOT";
  userId?: string | number;
  uuid?: string;
  eventList?: number[];
  emoticon?: string | null;
  emojiList?: Array<{ emojiId: number; userId: string[] }>;
  mention?: string[];
  mentionAll?: boolean;
  timestamp?: string;
}
