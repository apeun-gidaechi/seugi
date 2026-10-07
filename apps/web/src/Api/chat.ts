import { withSeugiApi } from "./client";

export const getChatRooms = (workspaceId: string, type: "group" | "personal") =>
  withSeugiApi((api) => api.rooms(workspaceId, type));

export const searchChatRooms = (workspaceId: string, word: string, type: "group" | "personal") =>
  withSeugiApi((api) => api.searchRooms(workspaceId, word, type));

export const createPersonalChatRoom = (workspaceId: string, name: string) =>
  withSeugiApi((api) => api.createRoom("personal", { workspaceId, name, memberIds: [] }));

export const getChatMessages = (roomId: string, timestamp?: string) =>
  withSeugiApi((api) => api.messages(roomId, timestamp));
