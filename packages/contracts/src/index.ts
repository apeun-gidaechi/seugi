export type ApiResponse<T> = { message: string; data?: T };
export type Role = "STUDENT" | "TEACHER" | "MIDDLE_ADMIN" | "ADMIN";
export type RoomType = "GROUP" | "PERSONAL";
export const CHAT_EMOJIS = ["👍", "👌", "👏", "😍", "😆", "😳", "😢", "😤"] as const;

export interface Tokens { accessToken: string; refreshToken: string }
export interface Member { id: string; email: string; name: string; picture?: string; birth?: string; role?: Role }
export interface Profile extends Member { workspaceId: string; role: Role; grade?: number; class?: number; number?: number; phone?: string; status?: string; nick?: string; spot?: string; belong?: string; wire?: string; location?: string; permission?: Role; profileImage?: string; schGrade?: number; schClass?: number; schNumber?: number }
export interface Workspace { id: string; code: string; name: string; schoolCode?: string; educationOfficeCode?: string; schoolType?: string; image?: string; members: string[]; waitlist: string[]; ownerId: string; workspaceId?: string; workspaceName?: string; workspaceImageUrl?: string; workspaceAdmin?: string; middleAdmin?: string[]; teacher?: string[]; student?: string[] }
export interface Room { id: string; workspaceId: string; type: RoomType; name: string; memberIds: string[]; adminId: string; image?: string }
export interface ChatMessage { id: string; roomId: string; senderId: string; message: string; createdAt: string; files?: string[]; emojis: Record<string, string[]>; messageStatus?: "ALIVE" | "DELETE"; chatRoomId?: string; type?: "MESSAGE" | "IMG" | "FILE"; userId?: string; uuid?: string; eventList?: string[]; emoticon?: string | null; emojiList?: Array<{ emojiId: number; userId: string[] }>; mention?: string[]; mentionAll?: boolean; timestamp?: string }
export interface Notification { id: string; workspaceId: string; title: string; content: string; authorId: string; createdAt: string; emojis: Record<string, string[]> }
export interface Timetable { id: string; workspaceId: string; grade: string; classNum: string; time: string; subject: string; date: string }
export interface Task { id: string; workspaceId: string; title: string; content?: string; dueDate?: string; createdAt: string }
export interface ClassroomTask { id: string; title: string; description?: string; link?: string; dueDate?: string }
export interface Meal { date: string; type: string; menu: string[]; calorie?: string }
export interface Schedule { date: string; name: string; workspaceId: string }
