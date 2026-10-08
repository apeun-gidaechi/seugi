import { path, query, route, segment } from "./helpers.js";

export const chatApiSpec = {
  createGroupRoom: route("POST", "/chat/group/create"),
  createPersonalRoom: route("POST", "/chat/personal/create"),
  groupRooms: path(
    "GET",
    "/chat/group/search/:workspaceId",
    (id: string) => `/chat/group/search/${segment(id)}`,
  ),
  personalRooms: path(
    "GET",
    "/chat/personal/search/:workspaceId",
    (id: string) => `/chat/personal/search/${segment(id)}`,
  ),
  searchGroupRooms: query(
    "GET",
    "/chat/group/search",
    (workspaceId: string, word = "") =>
      `/chat/group/search?workspace=${segment(workspaceId)}&word=${segment(word)}`,
  ),
  searchPersonalRooms: query(
    "GET",
    "/chat/personal/search",
    (workspaceId: string, word = "") =>
      `/chat/personal/search?workspace=${segment(workspaceId)}&word=${segment(word)}`,
  ),
  groupRoom: path(
    "GET",
    "/chat/group/search/room/:roomId",
    (id: string) => `/chat/group/search/room/${segment(id)}`,
  ),
  personalRoom: path(
    "GET",
    "/chat/personal/search/room/:roomId",
    (id: string) => `/chat/personal/search/room/${segment(id)}`,
  ),
  addGroupMembers: route("POST", "/chat/group/member/add"),
  removeGroupMembers: route("PATCH", "/chat/group/member/kick"),
  transferGroupAdmin: route("PATCH", "/chat/group/member/toss"),
  leaveGroupRoom: path(
    "PATCH",
    "/chat/group/left/:roomId",
    (id: string) => `/chat/group/left/${segment(id)}`,
  ),
  messages: query(
    "GET",
    "/message/search/:roomId",
    (id: string, timestamp?: string) =>
      `/message/search/${segment(id)}${timestamp ? `?timestamp=${segment(timestamp)}` : ""}`,
  ),
  addMessageEmoji: route("PUT", "/message/emoji"),
  removeMessageEmoji: route("DELETE", "/message/emoji"),
  deleteMessage: route("DELETE", "/message/delete"),
} as const;
