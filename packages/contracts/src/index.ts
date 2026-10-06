export type ApiResponse<T> = { message: string; data?: T };
export type Role = "STUDENT" | "TEACHER" | "MIDDLE_ADMIN" | "ADMIN";
export type RoomType = "GROUP" | "PERSONAL";

export interface Tokens { accessToken: string; refreshToken: string }
export interface Member { id: string; email: string; name: string; picture?: string }
export interface Profile extends Member { workspaceId: string; role: Role; grade?: number; class?: number; number?: number; phone?: string; status?: string }
export interface Workspace { id: string; code: string; name: string; schoolCode?: string; image?: string; members: string[]; waitlist: string[]; ownerId: string }
export interface Room { id: string; workspaceId: string; type: RoomType; name: string; memberIds: string[]; adminId: string; image?: string }
export interface ChatMessage { id: string; roomId: string; senderId: string; message: string; createdAt: string; files?: string[]; emojis: Record<string, string[]> }
export interface Notification { id: string; workspaceId: string; title: string; content: string; authorId: string; createdAt: string; emojis: Record<string, string[]> }
export interface Timetable { id: string; workspaceId: string; memberId: string; day: number; period: number; subject: string; teacher?: string; location?: string }
export interface Task { id: string; workspaceId: string; title: string; content?: string; dueDate?: string; createdAt: string }
export interface Meal { date: string; type: string; menu: string[]; calorie?: string }
export interface Schedule { date: string; name: string; workspaceId: string }
