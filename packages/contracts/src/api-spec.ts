import { createTaskSchema } from "./task.js";
import { createWorkspaceSchema, joinWorkspaceSchema, updateWorkspaceSchema } from "./workspace.js";
import { editMemberSchema, loginMemberSchema, logoutMemberSchema, memberDeviceTokenSchema, registerMemberSchema } from "./member.js";
import { editProfileSchema, editStudentNumberSchema } from "./profile.js";
import { chatMemberEventSchema, chatRoomSearchSchema, createChatRoomSchema, deleteMessageSchema, chatEmojiSchema, messageHistoryQuerySchema } from "./chat.js";
import { createNotificationSchema, notificationEmojiSchema, updateNotificationSchema } from "./notification.js";

/** Shared transport specification consumed by both the API server and SDK. */
export const API_SPEC = {
  registerMember: { method: "POST", path: "/member/register", body: registerMemberSchema },
  loginMember: { method: "POST", path: "/member/login", body: loginMemberSchema },
  editMember: { method: "PATCH", path: "/member/edit", body: editMemberSchema },
  addDeviceToken: { method: "POST", path: "/member/device-token", body: memberDeviceTokenSchema },
  removeDeviceToken: { method: "DELETE", path: "/member/device-token", body: memberDeviceTokenSchema },
  logoutMember: { method: "POST", path: "/member/logout", body: logoutMemberSchema },
  editProfile: { method: "PATCH", path: "/profile/:workspaceId", pathFor: (workspaceId: string) => `/profile/${encodeURIComponent(workspaceId)}`, body: editProfileSchema },
  editStudentNumber: { method: "PATCH", path: "/profile/schidnum/:workspaceId", pathFor: (workspaceId: string) => `/profile/schidnum/${encodeURIComponent(workspaceId)}`, body: editStudentNumberSchema },
  myProfile: { method: "GET", path: "/profile/me" },
  createGroupRoom: { method: "POST", path: "/chat/group/create", body: createChatRoomSchema },
  createPersonalRoom: { method: "POST", path: "/chat/personal/create", body: createChatRoomSchema },
  groupRooms: { method: "GET", path: "/chat/group/search/:workspaceId", pathFor: (workspaceId: string) => `/chat/group/search/${encodeURIComponent(workspaceId)}` },
  personalRooms: { method: "GET", path: "/chat/personal/search/:workspaceId", pathFor: (workspaceId: string) => `/chat/personal/search/${encodeURIComponent(workspaceId)}` },
  searchGroupRooms: { method: "GET", path: "/chat/group/search", query: chatRoomSearchSchema },
  searchPersonalRooms: { method: "GET", path: "/chat/personal/search", query: chatRoomSearchSchema },
  groupRoom: { method: "GET", path: "/chat/group/search/room/:roomId", pathFor: (roomId: string) => `/chat/group/search/room/${encodeURIComponent(roomId)}` },
  personalRoom: { method: "GET", path: "/chat/personal/search/room/:roomId", pathFor: (roomId: string) => `/chat/personal/search/room/${encodeURIComponent(roomId)}` },
  addGroupMembers: { method: "POST", path: "/chat/group/member/add", body: chatMemberEventSchema },
  removeGroupMembers: { method: "PATCH", path: "/chat/group/member/kick", body: chatMemberEventSchema },
  transferGroupAdmin: { method: "PATCH", path: "/chat/group/member/toss", body: chatMemberEventSchema },
  leaveGroupRoom: { method: "PATCH", path: "/chat/group/left/:roomId", pathFor: (roomId: string) => `/chat/group/left/${encodeURIComponent(roomId)}` },
  messages: { method: "GET", path: "/message/search/:roomId", pathFor: (roomId: string) => `/message/search/${encodeURIComponent(roomId)}`, query: messageHistoryQuerySchema },
  addMessageEmoji: { method: "PUT", path: "/message/emoji", body: chatEmojiSchema },
  removeMessageEmoji: { method: "DELETE", path: "/message/emoji", body: chatEmojiSchema },
  deleteMessage: { method: "DELETE", path: "/message/delete", body: deleteMessageSchema },
  createNotification: { method: "POST", path: "/notification", body: createNotificationSchema },
  listNotifications: { method: "GET", path: "/notification/:workspaceId", pathFor: (workspaceId: string) => `/notification/${encodeURIComponent(workspaceId)}` },
  updateNotification: { method: "PATCH", path: "/notification", body: updateNotificationSchema },
  deleteNotification: { method: "DELETE", path: "/notification/:workspaceId/:id", pathFor: (workspaceId: string, id: string) => `/notification/${encodeURIComponent(workspaceId)}/${encodeURIComponent(id)}` },
  toggleNotificationEmoji: { method: "PATCH", path: "/notification/emoji", body: notificationEmojiSchema },
  createTask: {
    method: "POST",
    path: "/task",
    body: createTaskSchema,
  },
  listTasks: {
    method: "GET",
    path: "/task/:workspaceId",
    pathFor: (workspaceId: string) => `/task/${encodeURIComponent(workspaceId)}`,
  },
  createWorkspace: { method: "POST", path: "/workspace", body: createWorkspaceSchema },
  updateWorkspace: { method: "PATCH", path: "/workspace", body: updateWorkspaceSchema },
  listWorkspaces: { method: "GET", path: "/workspace" },
  joinWorkspace: { method: "POST", path: "/workspace/join", body: joinWorkspaceSchema },
  workspaceMembers: { method: "GET", path: "/workspace/members" },
  workspaceMemberChart: { method: "GET", path: "/workspace/members/chart" },
} as const;
