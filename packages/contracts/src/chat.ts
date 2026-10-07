import { z } from "zod";
import { CHAT_EMOJIS } from "./constants.js";

export const createChatRoomSchema = z.object({ workspaceId: z.string().uuid(), name: z.string().max(80).optional(), roomName: z.string().max(80).optional(), memberIds: z.array(z.string().uuid()).optional(), joinUsers: z.array(z.string().uuid()).optional(), image: z.string().url().optional(), chatRoomImg: z.string().url().or(z.literal("")).optional() }).refine((input) => input.name !== undefined || input.roomName !== undefined, "채팅방 이름이 필요합니다").refine((input) => input.memberIds !== undefined || input.joinUsers !== undefined, "참여자가 필요합니다");
export const chatMemberEventSchema = z.object({ roomId: z.string().uuid(), memberIds: z.array(z.string().uuid()), memberId: z.string().uuid().optional() });
export const chatRoomSearchSchema = z.object({ workspace: z.string().uuid(), word: z.string().default("") });
export const messageHistoryQuerySchema = z.object({ timestamp: z.string().optional() });
export const chatEmojiSchema = z.object({ messageId: z.string().uuid(), emoji: z.enum(CHAT_EMOJIS) });
export const deleteMessageSchema = z.object({ roomId: z.string().uuid(), messageId: z.string().uuid() });

export type CreateChatRoomInput = z.input<typeof createChatRoomSchema>;
export type ChatMemberEventInput = z.input<typeof chatMemberEventSchema>;
