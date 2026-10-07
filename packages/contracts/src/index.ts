export { API_SPEC } from "./api-spec.js";
export { createTaskSchema, type CreateTaskInput } from "./task.js";
export { createWorkspaceSchema, updateWorkspaceSchema, joinWorkspaceSchema, workspaceFieldsSchema, workspaceNotificationsSchema, workspaceMemberSchema, workspaceWaitlistActionSchema, workspaceWaitlistQuerySchema, workspaceRoleSchema, updateWorkspaceMemberRoleSchema, kickWorkspaceMembersSchema, workspaceCodeParamSchema, type CreateWorkspaceInput, type UpdateWorkspaceInput, type JoinWorkspaceInput, type WorkspaceWaitlistActionInput, type UpdateWorkspaceMemberRoleInput, type KickWorkspaceMembersInput } from "./workspace.js";
export { registerMemberSchema, loginMemberSchema, editMemberSchema, memberDeviceTokenSchema, logoutMemberSchema, emailVerificationSchema, type RegisterMemberInput, type LoginMemberInput, type EditMemberInput } from "./member.js";
export { editProfileSchema, editStudentNumberSchema, profileWorkspaceQuerySchema, otherProfileQuerySchema, type EditProfileInput, type EditStudentNumberInput } from "./profile.js";
export { createChatRoomSchema, chatMemberEventSchema, chatRoomSearchSchema, messageHistoryQuerySchema, chatEmojiSchema, deleteMessageSchema, type CreateChatRoomInput, type ChatMemberEventInput } from "./chat.js";
export { createNotificationSchema, updateNotificationSchema, notificationEmojiSchema, type CreateNotificationInput, type UpdateNotificationInput } from "./notification.js";
export { createTimetableSchema, updateTimetableSchema, mealDateQuerySchema, mealRangeQuerySchema, monthScheduleQuerySchema, type CreateTimetableInput, type UpdateTimetableInput } from "./school.js";
export { oauthProviderSchema, authenticateOAuthSchema, connectGoogleSchema, sendVerificationQuerySchema, aiPromptSchema, uploadTypeSchema, type AuthenticateOAuthInput, type ConnectGoogleInput } from "./integrations.js";
export { CHAT_EMOJIS } from "./constants.js";

export type ApiResponse<T> = { message: string; data?: T };
export type Role = "STUDENT" | "TEACHER" | "MIDDLE_ADMIN" | "ADMIN";
export type RoomType = "GROUP" | "PERSONAL";

export interface Tokens { accessToken: string; refreshToken: string }
export interface Member { id: string; email: string; name: string; picture?: string; birth?: string; role?: Role }
export interface Profile extends Member { workspaceId: string; role: Role; grade?: number; class?: number; number?: number; phone?: string; status?: string; nick?: string; spot?: string; belong?: string; wire?: string; location?: string; permission?: Role; profileImage?: string; schGrade?: number; schClass?: number; schNumber?: number }
export interface Workspace { id: string; code: string; name: string; schoolCode?: string; educationOfficeCode?: string; schoolType?: string; image?: string; members: string[]; waitlist: string[]; ownerId: string; status?: "ALIVE" | "DELETE"; workspaceId?: string; workspaceName?: string; workspaceImageUrl?: string; workspaceAdmin?: string; middleAdmin?: string[]; teacher?: string[]; student?: string[] }
export interface WorkspaceMemberChartProfile { workspaceId: string; member: Pick<Member, "id" | "email" | "name" | "birth" | "picture">; permission: Role; schGrade: number; schClass: number; schNumber: number; status: string; nick: string; belong: string; spot: string; phone: string; wire: string; location: string }
export interface WorkspaceMemberChart { admin: Record<string, WorkspaceMemberChartProfile[]>; middleAdmin: Record<string, WorkspaceMemberChartProfile[]>; teachers: Record<string, WorkspaceMemberChartProfile[]>; students: Record<string, WorkspaceMemberChartProfile[]> }
export interface Room { id: string; workspaceId: string; type: RoomType; name: string; memberIds: string[]; adminId: string; image?: string; status?: "ALIVE" | "DELETE"; createdAt?: string; memberReadAt?: Record<string, string>; lastMessage?: string; lastMessageTimestamp?: string | null; notReadCnt?: number }
export interface ChatMessage { id: string; roomId: string; senderId: string; message: string; createdAt: string; files?: string[]; emojis: Record<string, string[]>; messageStatus?: "ALIVE" | "DELETE"; chatRoomId?: string; type?: "MESSAGE" | "IMG" | "FILE" | "BOT"; userId?: string | number; uuid?: string; eventList?: string[]; emoticon?: string | null; emojiList?: Array<{ emojiId: number; userId: string[] }>; mention?: string[]; mentionAll?: boolean; timestamp?: string }
export interface Notification { id: string; workspaceId: string; title: string; content: string; authorId: string; createdAt: string; updatedAt?: string; emojis: Record<string, string[]> }
export interface Timetable { id: string; workspaceId: string; grade: string; classNum: string; time: string; subject: string; date: string }
export interface Task { id: string; workspaceId: string; title: string; description?: string; content?: string; dueDate?: string; createdAt: string }
export interface ClassroomTask { id: string; title: string; description?: string; link?: string; dueDate?: string }
export interface Meal { date: string; type: string; menu: string[]; calorie?: string }
export interface Schedule { date: string; name: string; workspaceId: string }
