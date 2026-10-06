import { Server } from "socket.io";
import type { FastifyInstance } from "fastify";
import type { ChatMessage } from "@seugi/contracts";
import type { Store } from "./store.js";

export function attachRealtime(app: FastifyInstance, store: Store) {
  const io = new Server(app.server, { cors: { origin: true } });
  io.use((socket, next) => { try { socket.data.userId = app.jwt.verify<{ sub: string }>(socket.handshake.auth.token).sub; next(); } catch { next(new Error("UNAUTHORIZED")); } });
  io.on("connection", (socket) => {
    socket.on("room:join", (roomId: string) => { const room = store.rooms.get(roomId); if (room?.memberIds.includes(socket.data.userId)) socket.join(roomId); });
    socket.on("chat:message", (input: { roomId: string; message: string; files?: string[] }, done?: (result: unknown) => void) => {
      const room = store.rooms.get(input.roomId);
      if (!room?.memberIds.includes(socket.data.userId) || !input.message.trim()) return done?.({ message: "ROOM_NOT_FOUND" });
      const message: ChatMessage = { id: store.id(), roomId: room.id, senderId: socket.data.userId, message: input.message.trim(), files: input.files, createdAt: new Date().toISOString(), emojis: {} };
      store.messages.set(message.id, message); io.to(room.id).emit("chat:message", message); done?.({ message: "메시지 전송 성공", data: message });
    });
  });
  return io;
}
