import { Server } from "socket.io";
import { CHAT_EMOJIS } from "@seugi/contracts";
import type { ClientToServerEvents, ServerToClientEvents } from "@seugi/contracts";
import type { FastifyInstance } from "fastify";
import type { ChatMessage } from "@seugi/contracts";
import type { MessageEmojiEvent, Store } from "./store.js";
import { PushNotifications } from "./push.js";
import { answerSchoolQuestion, answerWithCatseugi, schoolQuestionIntent } from "./ai.js";
import { z } from "zod";
import { WebSocketServer, WebSocket } from "ws";

export function attachRealtime(app: FastifyInstance, store: Store) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, {}, { userId: string }>(app.server, { cors: { origin: true } });
  const stomp = attachStompCompatibility(app, store, io, (message) => replyToMention(message));
  const push = new PushNotifications();
  const replyToMention = (message: ChatMessage) => {
    if (!message.mention?.includes("-1")) return;
    const room = store.rooms.get(message.roomId);
    const profile = room ? store.profiles.get(`${room.workspaceId}:${message.senderId}`) : undefined;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const timetable = room && profile?.grade && profile.class
      ? [...store.timetables.values()].filter((item) => item.workspaceId === room.workspaceId && item.date.slice(0, 10) === today && item.grade === String(profile.grade) && item.classNum === String(profile.class))
      : [];
    const intent = schoolQuestionIntent(message.message);
    const schoolAnswer = room ? answerSchoolQuestion(message.message, {
      meals: (store.meals.get(room.workspaceId) ?? []).filter((meal) => meal.date.slice(0, 10) === today),
      timetable,
      notifications: [...store.notifications.values()].filter((item) => item.workspaceId === room.workspaceId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      members: intent === "PICK_MEMBER" || intent === "MAKE_TEAMS" ? room.memberIds.map((id) => store.requireMember(id)) : [],
    }) : undefined;
    void Promise.resolve(schoolAnswer ?? answerWithCatseugi(message.message)).then((answer) => store.withMutation(() => {
      const room = store.rooms.get(message.roomId);
      if (!room) return undefined;
      const reply: ChatMessage = { id: store.id(), roomId: room.id, senderId: "-1", message: JSON.stringify({ keyword: "기타", data: answer }), createdAt: new Date().toISOString(), emojis: {}, type: "BOT", mention: [message.senderId], mentionAll: false };
      store.messages.set(reply.id, reply);
      return reply;
    })).then((reply) => { if (reply) { io.to(reply.roomId).emit("chat:message", reply); stomp.publishMessage(reply); } })
      .catch((error) => app.log.error(error, "Catseugi chat reply failed"));
  };
  const unsubscribeMessageDeleted = store.onMessageDeleted((event) => io.to(event.roomId).emit("chat:message-deleted", event));
  const unsubscribeMessageEmoji = store.onMessageEmoji((event) => { io.to(event.roomId).emit("chat:message-emoji", event); stomp.publishEmoji(event); });
  app.addHook("onClose", async () => { unsubscribeMessageDeleted(); unsubscribeMessageEmoji(); });
  io.use((socket, next) => { try { socket.data.userId = app.jwt.verify<{ sub: string }>(socket.handshake.auth.token).sub; store.requireMember(socket.data.userId); next(); } catch { next(new Error("UNAUTHORIZED")); } });
  io.on("connection", (socket) => {
    const pendingRoomJoins = new Map<string, number>();
    let roomJoinSequence = 0;
    socket.on("room:join", (roomId: string, acknowledge) => {
      const sequence = ++roomJoinSequence;
      pendingRoomJoins.set(roomId, sequence);
      void store.withMutation(() => { const room = store.rooms.get(roomId); if (!room?.memberIds.includes(socket.data.userId)) return false; room.memberReadAt ??= {}; room.memberReadAt[socket.data.userId] = new Date().toISOString(); return true; })
        .then((allowed) => {
          if (allowed && pendingRoomJoins.get(roomId) === sequence) socket.join(roomId);
          if (pendingRoomJoins.get(roomId) === sequence) pendingRoomJoins.delete(roomId);
          acknowledge?.(allowed);
        })
        .catch((error) => {
          if (pendingRoomJoins.get(roomId) === sequence) pendingRoomJoins.delete(roomId);
          acknowledge?.(false);
          app.log.error(error, "realtime room authorization failed");
        });
    });
    socket.on("room:leave", (roomId: string, acknowledge) => {
      pendingRoomJoins.delete(roomId);
      void Promise.resolve(socket.leave(roomId)).then(() => acknowledge?.())
        .catch((error) => app.log.error(error, "realtime room leave failed"));
    });
    socket.on("chat:message", (rawInput, done) => {
      const parsed = z.object({ roomId: z.string().uuid(), message: z.string().max(20_000).default(""), type: z.enum(["MESSAGE", "IMG", "FILE"]).default("MESSAGE"), files: z.array(z.string().min(1).max(2048)).max(10).optional(), mention: z.array(z.union([z.string(), z.number().int()])).max(100).optional(), mentionAll: z.boolean().optional() }).refine((input) => !!input.message.trim() || !!input.files?.length).safeParse(rawInput);
      if (!parsed.success) return done?.({ message: "MESSAGE_INVALID" });
      void store.withMutation(() => {
        const input = parsed.data;
        const room = store.rooms.get(input.roomId);
        if (!room?.memberIds.includes(socket.data.userId)) return { error: "ROOM_NOT_FOUND" as const };
        const shouldReply = (input.mention ?? []).some((id) => String(id) === "-1") || input.message.includes("스기야");
        const mention = [...new Set([...(input.mention ?? []).map(String), ...(shouldReply ? ["-1"] : [])])];
        const message: ChatMessage = { id: store.id(), roomId: room.id, senderId: socket.data.userId, message: input.message.trim(), files: input.files, type: input.type, createdAt: new Date().toISOString(), emojis: {}, mention, mentionAll: input.mentionAll ?? false };
        store.messages.set(message.id, message);
        const sender = store.requireMember(socket.data.userId);
        const tokens = store.pushTokensForWorkspace(room.workspaceId, room.memberIds, socket.data.userId);
        return { room, message, senderName: sender.name, senderPicture: sender.picture, tokens };
      }).then((result) => {
        if ("error" in result) return done?.({ message: result.error ?? "ROOM_NOT_FOUND" });
        io.to(result.room.id).emit("chat:message", result.message);
        stomp.publishMessage(result.message);
        replyToMention(result.message);
        const preview = result.message.type === "IMG" ? "사진을 보냈습니다." : result.message.type === "FILE" || (result.message.files?.length && !result.message.message) ? "파일을 보냈습니다." : result.message.message;
        void push.send(result.tokens, { title: result.room.name || "1대1 채팅", body: `${result.senderName}: ${preview}`, imageUrl: result.senderPicture }).catch((error) => app.log.error(error, "FCM chat push failed"));
        done?.({ message: "메시지 전송 성공", data: result.message });
      }).catch((error) => { app.log.error(error, "realtime message persistence failed"); done?.({ message: "메시지 저장에 실패했습니다" }); });
    });
  });
  return io;
}

/** STOMP 1.2 compatibility endpoint for the original Android/iOS clients. */
function attachStompCompatibility(app: FastifyInstance, store: Store, io: Server, replyToMention: (message: ChatMessage) => void) {
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Map<WebSocket, { userId?: string; rooms: Set<string> }>();
  const write = (socket: WebSocket, command: string, headers: Record<string, string>, body = "") => {
    if (socket.readyState !== WebSocket.OPEN) return;
    const frame = `${command}\n${Object.entries(headers).map(([key, value]) => `${key}:${value}`).join("\n")}\ncontent-length:${Buffer.byteLength(body)}\n\n${body}\0`;
    socket.send(frame);
  };
  const publish = (roomId: string, message: ChatMessage) => {
    const legacyType = message.type === "BOT" || message.type === "IMG" || message.type === "FILE" ? message.type : message.files?.length ? (/\.(?:png|jpe?g|gif|webp|heic|bmp)(?:[?#]|$)/i.test(message.files[0]!) ? "IMG" : "FILE") : "MESSAGE";
    const body = JSON.stringify({ type: legacyType, roomId, message: message.message || (message.files?.[0] ?? ""), uuid: message.id, eventList: [], emoticon: null, mention: message.mention ?? [], mentionAll: message.mentionAll ?? false, files: message.files, userId: message.senderId === "-1" ? -1 : message.senderId, timestamp: message.createdAt });
    for (const [socket, state] of clients) if (state.rooms.has(roomId)) write(socket, "MESSAGE", { destination: `/exchange/chat.exchange/room.${roomId}`, "content-type": "application/json" }, body);
  };
  const publishEmoji = (event: MessageEmojiEvent) => {
    const body = JSON.stringify({ type: event.action === "ADD" ? "ADD_EMOJI" : "REMOVE_EMOJI", roomId: event.roomId, messageId: event.messageId, emojiId: CHAT_EMOJIS.indexOf(event.emoji as (typeof CHAT_EMOJIS)[number]) + 1, emoji: event.emoji, userId: event.senderId });
    for (const [socket, state] of clients) if (state.rooms.has(event.roomId)) write(socket, "MESSAGE", { destination: `/exchange/chat.exchange/room.${event.roomId}`, "content-type": "application/json" }, body);
  };
  app.server.on("upgrade", (request, socket, head) => {
    if (new URL(request.url ?? "/", "http://localhost").pathname !== "/stomp/chat") return;
    wss.handleUpgrade(request, socket, head, (client) => wss.emit("connection", client, request));
  });
  wss.on("connection", (socket) => {
    const state = { rooms: new Set<string>() } as { userId?: string; rooms: Set<string> };
    clients.set(socket, state);
    let buffer = "";
    socket.on("message", (data) => {
      buffer += data.toString();
      while (buffer.includes("\0")) {
        const end = buffer.indexOf("\0"); const raw = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        const separator = raw.indexOf("\n\n"); if (separator < 0) continue;
        const lines = raw.slice(0, separator).split("\n"); const command = lines.shift()?.trim();
        const headers = Object.fromEntries(lines.map((line) => { const index = line.indexOf(":"); return index < 0 ? [line, ""] : [line.slice(0, index), line.slice(index + 1).trimStart()]; }));
        const body = raw.slice(separator + 2);
        if (command === "CONNECT" || command === "STOMP") {
          const match = /^Bearer\s+(.+)$/i.exec(headers.Authorization ?? headers.authorization ?? "");
          try { if (!match) throw new Error(); state.userId = app.jwt.verify<{ sub: string }>(match[1]).sub; store.requireMember(state.userId); write(socket, "CONNECTED", { version: "1.2", "heart-beat": "0,0" }); }
          catch { write(socket, "ERROR", { message: "UNAUTHORIZED" }, "인증에 실패했습니다."); socket.close(1008, "UNAUTHORIZED"); }
        } else if (command === "SUBSCRIBE" && state.userId) {
          const roomId = /\/room\.([0-9a-f-]{36})$/i.exec(headers.destination ?? "")?.[1];
          void store.withMutation(() => { const room = roomId ? store.rooms.get(roomId) : undefined; if (!room?.memberIds.includes(state.userId!)) return false; room.memberReadAt ??= {}; room.memberReadAt[state.userId!] = new Date().toISOString(); return true; }).then((allowed) => {
            if (allowed && roomId) state.rooms.add(roomId); else write(socket, "ERROR", { message: "ROOM_NOT_FOUND" }, "채팅방을 찾을 수 없습니다.");
          }).catch((error) => app.log.error(error, "STOMP room authorization failed"));
        } else if (command === "SEND" && state.userId) {
          let rawInput: unknown; try { rawInput = JSON.parse(body); } catch { write(socket, "ERROR", { message: "MESSAGE_INVALID" }); continue; }
          const parsed = z.object({ roomId: z.string().uuid(), message: z.string().max(20_000).default(""), files: z.array(z.string().min(1).max(2048)).max(10).optional(), uuid: z.string().optional(), mention: z.array(z.union([z.string(), z.number().int()])).max(100).optional(), mentionAll: z.boolean().optional() }).refine((input) => !!input.message.trim() || !!input.files?.length).safeParse(rawInput);
          if (!parsed.success) { write(socket, "ERROR", { message: "MESSAGE_INVALID" }); continue; }
          void store.withMutation(() => {
            const input = parsed.data; const room = store.rooms.get(input.roomId);
            if (!room?.memberIds.includes(state.userId!)) return undefined;
            const shouldReply = (input.mention ?? []).some((id) => String(id) === "-1") || input.message.includes("스기야");
            const mention = [...new Set([...(input.mention ?? []).map(String), ...(shouldReply ? ["-1"] : [])])];
            const message: ChatMessage = { id: store.id(), roomId: room.id, senderId: state.userId!, message: input.message.trim(), files: input.files, createdAt: new Date().toISOString(), emojis: {}, mention, mentionAll: input.mentionAll ?? false };
            store.messages.set(message.id, message); return message;
          }).then((message) => { if (!message) write(socket, "ERROR", { message: "ROOM_NOT_FOUND" }); else { io.to(message.roomId).emit("chat:message", message); publish(message.roomId, message); replyToMention(message); } }).catch((error) => app.log.error(error, "STOMP message persistence failed"));
        } else if (command === "DISCONNECT") socket.close();
      }
    });
    socket.on("close", () => clients.delete(socket));
  });
  const unsubscribeDeleted = store.onMessageDeleted((event) => {
    const body = JSON.stringify({ type: "DELETE_MESSAGE", roomId: event.roomId, messageId: event.messageId, userId: event.senderId });
    for (const [socket, state] of clients) if (state.rooms.has(event.roomId)) write(socket, "MESSAGE", { destination: `/exchange/chat.exchange/room.${event.roomId}`, "content-type": "application/json" }, body);
  });
  app.addHook("onClose", async () => { unsubscribeDeleted(); for (const client of wss.clients) client.close(); await new Promise<void>((resolve) => wss.close(() => resolve())); });
  return { publishMessage: (message: ChatMessage) => publish(message.roomId, message), publishEmoji };
}
