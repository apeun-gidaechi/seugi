import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  API_SPEC,
  CHAT_EMOJIS,
  chatEmojiSchema,
  chatMemberEventSchema,
  chatRoomSearchSchema,
  createChatRoomSchema,
  deleteMessageSchema,
  messageHistoryQuerySchema,
  workspaceIdParamSchema,
  type ChatMessage,
  type RoomType,
} from "@seugi/contracts";
import type { Store } from "../store.js";
import { chatRoomName } from "../chatRoomName.js";
import { body, ok, query } from "../http/helpers.js";
import { workspaceParam } from "./params.js";

export function registerChatRoutes(
  app: FastifyInstance,
  deps: {
    store: Store;
    auth: (request: FastifyRequest) => Promise<void>;
  },
) {
  const { store, auth } = deps;

  const legacyRoom = (
    room: {
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
    },
    memberId: string,
  ) => {
    const roomMessages = [...store.messages.values()]
      .filter((message) => message.roomId === room.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const lastMessage = roomMessages.at(-1);
    const joinUserInfo = room.memberIds.map((id) => {
      const member = store.requireMember(id);
      return {
        userInfo: {
          id,
          email: member.email,
          birth: member.birth ?? "",
          name: member.name,
          picture: member.picture ?? "",
        },
        timestamp: room.memberReadAt?.[id] ?? room.createdAt ?? new Date(0).toISOString(),
      };
    });
    const chatName = chatRoomName(
      room.type,
      room.name,
      joinUserInfo.map((entry) => ({
        id: entry.userInfo.id,
        name: entry.userInfo.name,
      })),
      memberId,
    );
    const readAt = room.memberReadAt?.[memberId] ?? room.createdAt ?? new Date(0).toISOString();
    return {
      ...room,
      roomAdmin: room.adminId,
      chatName,
      chatRoomImg: room.image ?? "",
      createdAt: room.createdAt ?? new Date(0).toISOString(),
      chatStatusEnum: room.status === "DELETE" ? "DELETE" : "ACTIVE",
      joinUserInfo,
      lastMessage:
        lastMessage &&
        lastMessage.messageStatus !== "DELETE" &&
        (!lastMessage.type || lastMessage.type === "MESSAGE")
          ? lastMessage.message
          : "",
      lastMessageTimestamp: lastMessage?.createdAt ?? new Date().toISOString(),
      notReadCnt: roomMessages.filter(
        (message) =>
          message.type !== "BOT" &&
          message.messageStatus !== "DELETE" &&
          message.createdAt > readAt,
      ).length,
    };
  };
  const createRoom = (type: RoomType) => async (request: FastifyRequest) => {
    const input = body(createChatRoomSchema, request);
    if (!store.canAccess(input.workspaceId, request.user.sub)) throw new Error("권한이 없습니다");
    const workspace = store.requireWorkspace(input.workspaceId);
    const requestedMemberIds = input.memberIds ?? input.joinUsers!;
    if (requestedMemberIds.some((id: string) => !workspace.members.includes(id)))
      throw new Error("권한이 없습니다");
    const memberIds = [...new Set([request.user.sub, ...requestedMemberIds])];
    if (type === "PERSONAL" && memberIds.length !== 2)
      throw Object.assign(new Error("개인 채팅은 참여자가 두 명이어야 합니다"), {
        statusCode: 400,
      });
    if (type === "PERSONAL") {
      const existing = [...store.rooms.values()].find(
        (room) =>
          room.status !== "DELETE" &&
          room.type === type &&
          room.workspaceId === input.workspaceId &&
          room.memberIds.length === memberIds.length &&
          room.memberIds.every((id) => memberIds.includes(id)),
      );
      if (existing) return ok("채팅방 생성 성공", existing.id);
    }
    const rawName = input.name ?? input.roomName ?? "";
    const counterpartName =
      type === "PERSONAL"
        ? store.requireMember(memberIds.find((id) => id !== request.user.sub)!).name
        : memberIds
            .map((id) => store.requireMember(id).name)
            .join(", ")
            .slice(0, 80);
    const createdAt = new Date().toISOString();
    const room = {
      id: store.id(),
      type,
      workspaceId: input.workspaceId,
      name: rawName || counterpartName,
      image: input.image ?? input.chatRoomImg ?? undefined,
      memberIds,
      adminId: request.user.sub,
      createdAt,
      memberReadAt: Object.fromEntries(memberIds.map((id) => [id, createdAt])),
    };
    store.rooms.set(room.id, room);
    return ok("채팅방 생성 성공", room.id);
  };
  for (const [path, type] of [
    [API_SPEC.createGroupRoom.path, "GROUP"],
    [API_SPEC.createPersonalRoom.path, "PERSONAL"],
  ] as const)
    app.post(path, { preHandler: auth }, createRoom(type));
  for (const [prefix, type] of [
    ["/chat/group", "GROUP"],
    ["/chat/personal", "PERSONAL"],
  ] as const) {
    app.get(
      type === "GROUP" ? API_SPEC.groupRooms.path : API_SPEC.personalRooms.path,
      { preHandler: auth },
      async (request) => {
        const workspaceId = workspaceParam.parse(request.params).workspaceId;
        const rooms = [...store.rooms.values()].filter(
          (room) =>
            room.status !== "DELETE" &&
            room.workspaceId === workspaceId &&
            room.type === type &&
            room.memberIds.includes(request.user.sub),
        );
        return ok(
          "채팅방 목록 조회 성공",
          rooms.map((room) => legacyRoom(room, request.user.sub)),
        );
      },
    );
    app.get(
      type === "GROUP" ? API_SPEC.groupRoom.path : API_SPEC.personalRoom.path,
      { preHandler: auth },
      async (request) => {
        const roomId = z.object({ roomId: z.string().uuid() }).parse(request.params).roomId;
        const room = store.rooms.get(roomId);
        if (
          !room ||
          room.status === "DELETE" ||
          room.type !== type ||
          !room.memberIds.includes(request.user.sub)
        )
          throw new Error("ROOM_NOT_FOUND");
        return ok("채팅방 조회 성공", legacyRoom(room, request.user.sub));
      },
    );
    app.get(
      type === "GROUP" ? API_SPEC.searchGroupRooms.path : API_SPEC.searchPersonalRooms.path,
      { preHandler: auth },
      async (request) => {
        const input = query(chatRoomSearchSchema, request);
        return ok(
          "채팅방 검색 성공",
          [...store.rooms.values()]
            .filter(
              (room) =>
                room.status !== "DELETE" &&
                room.workspaceId === input.workspace &&
                room.type === type &&
                room.memberIds.includes(request.user.sub) &&
                room.name.includes(input.word),
            )
            .map((room) => legacyRoom(room, request.user.sub)),
        );
      },
    );
  }
  app.patch(API_SPEC.leaveGroupRoom.path, { preHandler: auth }, async (request) => {
    const room = store.rooms.get(
      z.object({ roomId: z.string().uuid() }).parse(request.params).roomId,
    );
    if (!room || room.status === "DELETE" || !room.memberIds.includes(request.user.sub))
      throw new Error("ROOM_NOT_FOUND");
    if (room.type !== "GROUP")
      throw Object.assign(new Error("CHAT_TYPE_ERROR"), { statusCode: 400 });
    if (room.adminId === request.user.sub && room.memberIds.length !== 1)
      throw Object.assign(new Error("CHAT_LEFT_ERROR"), { statusCode: 400 });
    room.memberIds = room.memberIds.filter((id) => id !== request.user.sub);
    if (room.memberReadAt) delete room.memberReadAt[request.user.sub];
    if (room.memberIds.length === 0) room.status = "DELETE";
    return ok("채팅방 나가기 성공");
  });
  app.post(API_SPEC.addGroupMembers.path, { preHandler: auth }, async (request) => {
    const input = body(chatMemberEventSchema, request);
    const room = store.rooms.get(input.roomId);
    if (!room || room.type !== "GROUP" || !room.memberIds.includes(request.user.sub))
      throw new Error("권한이 없습니다");
    const workspace = store.requireWorkspace(room.workspaceId);
    if (input.memberIds.some((id: string) => !workspace.members.includes(id)))
      throw new Error("권한이 없습니다");
    const addedAt = new Date().toISOString();
    const newMembers = input.memberIds.filter((id: string) => !room.memberIds.includes(id));
    room.memberIds = [...new Set([...room.memberIds, ...input.memberIds])];
    room.memberReadAt ??= {};
    for (const id of newMembers) room.memberReadAt[id] = addedAt;
    return ok("참여자 추가 성공");
  });
  app.patch(API_SPEC.removeGroupMembers.path, { preHandler: auth }, async (request) => {
    const input = body(chatMemberEventSchema, request);
    const room = store.rooms.get(input.roomId);
    if (
      !room ||
      room.type !== "GROUP" ||
      room.adminId !== request.user.sub ||
      input.memberIds.includes(room.adminId) ||
      input.memberIds.some((id: string) => !room.memberIds.includes(id))
    )
      throw new Error("권한이 없습니다");
    room.memberIds = room.memberIds.filter((id: string) => !input.memberIds.includes(id));
    if (room.memberReadAt) for (const id of input.memberIds) delete room.memberReadAt[id];
    return ok("참여자 추방 성공");
  });
  app.patch(API_SPEC.transferGroupAdmin.path, { preHandler: auth }, async (request) => {
    const input = body(chatMemberEventSchema, request);
    const room = store.rooms.get(input.roomId);
    const nextAdmin = input.memberId ?? input.memberIds[0];
    if (
      !room ||
      room.type !== "GROUP" ||
      room.adminId !== request.user.sub ||
      !nextAdmin ||
      !room.memberIds.includes(nextAdmin)
    )
      throw new Error("권한이 없습니다");
    room.adminId = nextAdmin;
    return ok("방장 위임 성공");
  });
  const legacyMessage = (message: ChatMessage): ChatMessage => {
    const type =
      message.type === "BOT"
        ? "BOT"
        : message.type === "IMG" || message.type === "FILE"
          ? message.type
          : message.files?.length
            ? /\.(?:png|jpe?g|gif|webp|heic|bmp)(?:[?#]|$)/i.test(message.files[0])
              ? "IMG"
              : "FILE"
            : "MESSAGE";
    return {
      ...message,
      message: message.message || (message.files?.[0] ?? ""),
      chatRoomId: message.roomId,
      type,
      userId: message.senderId === "-1" ? -1 : message.senderId,
      uuid: message.uuid ?? message.id,
      eventList: message.eventList ?? [],
      emoticon: message.emoticon ?? null,
      emojiList: CHAT_EMOJIS.flatMap((emoji, index) => {
        const userIds = message.emojis[emoji] ?? [];
        return userIds.length ? [{ emojiId: index + 1, userId: userIds }] : [];
      }),
      mention: message.mention ?? [],
      mentionAll: message.mentionAll ?? false,
      timestamp: message.createdAt,
      messageStatus: message.messageStatus ?? "ALIVE",
    };
  };
  app.get(API_SPEC.messages.path, { preHandler: auth }, async (request) => {
    const roomId = z.object({ roomId: z.string().uuid() }).parse(request.params).roomId;
    const room = store.rooms.get(roomId);
    if (!room?.memberIds.includes(request.user.sub)) throw new Error("ROOM_NOT_FOUND");
    const timestamp = query(messageHistoryQuerySchema, request).timestamp;
    const messages = [...store.messages.values()]
      .filter((item) => item.roomId === roomId && (!timestamp || item.createdAt < timestamp))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50);
    return ok("메시지 조회 성공", {
      messages: messages.map(legacyMessage),
      firstMessageId: messages.at(-1)?.id ?? null,
      hasNext: messages.length === 50,
    });
  });
  app.put(API_SPEC.addMessageEmoji.path, { preHandler: auth }, async (request) => {
    const input = body(chatEmojiSchema, request);
    const message = store.messages.get(input.messageId);
    if (!message || message.messageStatus === "DELETE") throw new Error("MESSAGE_NOT_FOUND");
    const room = store.rooms.get(message.roomId);
    if (!room?.memberIds.includes(request.user.sub)) throw new Error("권한이 없습니다");
    const users = message.emojis[input.emoji] ?? [];
    if (!users.includes(request.user.sub)) {
      message.emojis[input.emoji] = [...users, request.user.sub];
      store.queueMessageEmoji({
        roomId: room.id,
        messageId: message.id,
        senderId: request.user.sub,
        emoji: input.emoji,
        action: "ADD",
      });
    }
    return ok("이모지 추가 성공");
  });
  app.delete(API_SPEC.removeMessageEmoji.path, { preHandler: auth }, async (request) => {
    const input = body(chatEmojiSchema, request);
    const message = store.messages.get(input.messageId);
    if (!message || message.messageStatus === "DELETE") throw new Error("MESSAGE_NOT_FOUND");
    const room = store.rooms.get(message.roomId);
    if (!room?.memberIds.includes(request.user.sub)) throw new Error("권한이 없습니다");
    const users = message.emojis[input.emoji] ?? [];
    if (users.includes(request.user.sub)) {
      message.emojis[input.emoji] = users.filter((id) => id !== request.user.sub);
      store.queueMessageEmoji({
        roomId: room.id,
        messageId: message.id,
        senderId: request.user.sub,
        emoji: input.emoji,
        action: "REMOVE",
      });
    }
    return ok("이모지 삭제 성공");
  });
  app.delete(API_SPEC.deleteMessage.path, { preHandler: auth }, async (request) => {
    const input = body(deleteMessageSchema, request);
    const message = store.messages.get(input.messageId);
    const room = store.rooms.get(input.roomId);
    if (
      !message ||
      message.roomId !== input.roomId ||
      message.senderId !== request.user.sub ||
      !room?.memberIds.includes(request.user.sub)
    )
      throw new Error("MESSAGE_NOT_FOUND");
    if (message.messageStatus !== "DELETE") {
      store.messages.set(message.id, {
        ...message,
        message: "",
        files: undefined,
        messageStatus: "DELETE",
      });
      store.queueMessageDeleted({
        roomId: room.id,
        messageId: message.id,
        senderId: request.user.sub,
      });
    }
    return ok("메시지 삭제 성공");
  });
}
