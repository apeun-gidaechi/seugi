import { io, type Socket } from "socket.io-client";
import Cookies from "js-cookie";
import type { ChatMessage, ClientToServerEvents, ServerToClientEvents } from "@seugi/contracts";

type SeugiSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
let socket: SeugiSocket | undefined;
const listeners = new Map<string, (message: ChatMessage) => void>();
const apiUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:8080";

export const socketService = {
  connect: (callback?: () => void) => {
    if (socket?.connected) { callback?.(); return; }
    const token = Cookies.get("accessToken")?.replace("Bearer ", "");
    socket = io(apiUrl, { auth: { token } }) as SeugiSocket;
    socket.on("connect", () => callback?.());
    socket.on("connect_error", (error) => console.error("소켓 연결 오류:", error));
  },
  disconnect: () => { socket?.close(); socket = undefined; listeners.clear(); },
  sendMessage: (payload: string) => {
    if (!socket?.connected) return console.error("소켓이 연결되지 않았습니다.");
    try {
      const message = JSON.parse(payload) as { roomId: string; message: string };
      socket.emit("chat:message", { roomId: message.roomId, message: message.message }, (result: { message: string }) => {
        if (result.message !== "메시지 전송 성공") console.error(result.message);
      });
    } catch (error) { console.error(error); }
  },
  subscribeToMessages: (roomId: string, callback: (message: string) => void) => {
    if (!socket?.connected) { socketService.connect(() => socketService.subscribeToMessages(roomId, callback)); return; }
    socket.emit("room:join", roomId);
    const listener = (message: ChatMessage) => callback(JSON.stringify(message));
    listeners.set(roomId, listener); socket.on("chat:message", listener);
  },
  unsubscribeFromMessages: (roomId: string) => {
    const listener = listeners.get(roomId); if (listener) socket?.off("chat:message", listener); listeners.delete(roomId);
  },
};
