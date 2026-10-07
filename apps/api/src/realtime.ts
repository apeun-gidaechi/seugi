import { Server } from "socket.io";
import { CHAT_EMOJIS } from "@seugi/contracts";
import type { FastifyInstance } from "fastify";
import type { ChatMessage } from "@seugi/contracts";
import type { MessageEmojiEvent, Store } from "./store.js";
import { PushNotifications } from "./push.js";
import { z } from "zod";
import { WebSocketServer, WebSocket } from "ws";

export function attachRealtime(app: FastifyInstance, store: Store) {
  const io = new Server(app.server, { cors: { origin: true } });
  const stomp = attachStompCompatibility(app, store, io);
  const push = new PushNotifications();
  const unsubscribeMessageDeleted = store.onMessageDeleted((event) => io.to(event.roomId).emit("chat:message-deleted", event));
  const unsubscribeMessageEmoji = store.onMessageEmoji((event) => { io.to(event.roomId).emit("chat:message-emoji", event); stomp.publishEmoji(event); });
  app.addHook("onClose", async () => { unsubscribeMessageDeleted(); unsubscribeMessageEmoji(); });
  io.use((socket, next) => { try { socket.data.userId = app.jwt.verify<{ sub: string }>(socket.handshake.auth.token).sub; store.requireMember(socket.data.userId); next(); } catch { next(new Error("UNAUTHORIZED")); } });
  io.on("connection", (socket) => {
    socket.on("room:join", (roomId: string) => {
      void store.withMutation(() => { const room = store.rooms.get(roomId); if (!room?.memberIds.includes(socket.data.userId)) return false; room.memberReadAt ??= {}; room.memberReadAt[socket.data.userId] = new Date().toISOString(); return true; })
        .then((allowed) => { if (allowed) socket.join(roomId); })
        .catch((error) => app.log.error(error, "realtime room authorization failed"));
    });
    socket.on("chat:message", (rawInput: unknown, done?: (result: unknown) => void) => {
      const parsed = z.object({ roomId: z.string().uuid(), message: z.string().max(20_000).default(""), files: z.array(z.string().min(1).max(2048)).max(10).optional() }).refine((input) => !!input.message.trim() || !!input.files?.length).safeParse(rawInput);
      if (!parsed.success) return done?.({ message: "MESSAGE_INVALID" });
      void store.withMutation(() => {
        const input = parsed.data;
        const room = store.rooms.get(input.roomId);
        if (!room?.memberIds.includes(socket.data.userId)) return { error: "ROOM_NOT_FOUND" as const };
        const message: ChatMessage = { id: store.id(), roomId: room.id, senderId: socket.data.userId, message: input.message.trim(), files: input.files, createdAt: new Date().toISOString(), emojis: {} };
        store.messages.set(message.id, message);
        const sender = store.requireMember(socket.data.userId);
        const tokens = store.pushTokensForWorkspace(room.workspaceId, room.memberIds, socket.data.userId);
        return { room, message, senderName: sender.name, senderPicture: sender.picture, tokens };
      }).then((result) => {
        if ("error" in result) return done?.({ message: result.error });
        io.to(result.room.id).emit("chat:message", result.message);
        stomp.publishMessage(result.message);
        void push.send(result.tokens, { title: result.room.name || "1대1 채팅", body: `${result.senderName}: ${result.message.files?.length && !result.message.message ? "파일을 보냈습니다." : result.message.message}`, imageUrl: result.senderPicture }).catch((error) => app.log.error(error, "FCM chat push failed"));
        done?.({ message: "메시지 전송 성공", data: result.message });
      }).catch((error) => { app.log.error(error, "realtime message persistence failed"); done?.({ message: "메시지 저장에 실패했습니다" }); });
    });
  });
  return io;
}

/** STOMP 1.2 compatibility endpoint for the original Android/iOS clients. */
function attachStompCompatibility(app: FastifyInstance, store: Store, io: Server) {
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Map<WebSocket, { userId?: string; rooms: Set<string> }>();
  const write = (socket: WebSocket, command: string, headers: Record<string, string>, body = "") => {
    if (socket.readyState !== WebSocket.OPEN) return;
    const frame = `${command}\n${Object.entries(headers).map(([key, value]) => `${key}:${value}`).join("\n")}\ncontent-length:${Buffer.byteLength(body)}\n\n${body}\0`;
    socket.send(frame);
  };
  const publish = (roomId: string, message: ChatMessage) => {
    const body = JSON.stringify({ type: "MESSAGE", roomId, message: message.message, uuid: message.id, eventList: [], emoticon: null, mention: [], mentionAll: false, files: message.files, userId: message.senderId, timestamp: message.createdAt });
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
          const parsed = z.object({ roomId: z.string().uuid(), message: z.string().max(20_000).default(""), files: z.array(z.string().min(1).max(2048)).max(10).optional(), uuid: z.string().optional() }).refine((input) => !!input.message.trim() || !!input.files?.length).safeParse(rawInput);
          if (!parsed.success) { write(socket, "ERROR", { message: "MESSAGE_INVALID" }); continue; }
          void store.withMutation(() => {
            const input = parsed.data; const room = store.rooms.get(input.roomId);
            if (!room?.memberIds.includes(state.userId!)) return undefined;
            const message: ChatMessage = { id: store.id(), roomId: room.id, senderId: state.userId!, message: input.message.trim(), files: input.files, createdAt: new Date().toISOString(), emojis: {} };
            store.messages.set(message.id, message); return message;
          }).then((message) => { if (!message) write(socket, "ERROR", { message: "ROOM_NOT_FOUND" }); else { io.to(message.roomId).emit("chat:message", message); publish(message.roomId, message); } }).catch((error) => app.log.error(error, "STOMP message persistence failed"));
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
