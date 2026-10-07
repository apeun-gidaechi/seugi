import { Server } from "socket.io";
import type { FastifyInstance } from "fastify";
import type { ChatMessage } from "@seugi/contracts";
import type { Store } from "./store.js";
import { PushNotifications } from "./push.js";
import { z } from "zod";

export function attachRealtime(app: FastifyInstance, store: Store) {
  const io = new Server(app.server, { cors: { origin: true } });
  const push = new PushNotifications();
  const unsubscribeMessageDeleted = store.onMessageDeleted((event) => io.to(event.roomId).emit("chat:message-deleted", event));
  app.addHook("onClose", async () => { unsubscribeMessageDeleted(); });
  io.use((socket, next) => { try { socket.data.userId = app.jwt.verify<{ sub: string }>(socket.handshake.auth.token).sub; next(); } catch { next(new Error("UNAUTHORIZED")); } });
  io.on("connection", (socket) => {
    socket.on("room:join", (roomId: string) => {
      void store.withMutation(() => { const room = store.rooms.get(roomId); return !!room?.memberIds.includes(socket.data.userId); })
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
        void push.send(result.tokens, { title: result.room.name || "1대1 채팅", body: `${result.senderName}: ${result.message.files?.length && !result.message.message ? "파일을 보냈습니다." : result.message.message}`, imageUrl: result.senderPicture }).catch((error) => app.log.error(error, "FCM chat push failed"));
        done?.({ message: "메시지 전송 성공", data: result.message });
      }).catch((error) => { app.log.error(error, "realtime message persistence failed"); done?.({ message: "메시지 저장에 실패했습니다" }); });
    });
  });
  return io;
}
