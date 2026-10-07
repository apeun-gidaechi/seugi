import { io, type Socket } from "socket.io-client";
import Cookies from "js-cookie";
import type { ChatMessage, ChatMessageInput, ClientToServerEvents, ServerToClientEvents } from "@seugi/contracts";
import { SERVER_URL, withSeugiApi } from "@/Api/client";

type SeugiSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
let socket: SeugiSocket | undefined;
const listeners = new Map<string, (message: ChatMessage) => void>();
export const socketService = {
  connect: (callback?: () => void) => {
    if (socket) {
      if (socket.connected) callback?.();
      else {
        if (callback) socket.once("connect", callback);
        if (!socket.active) socket.connect();
      }
      return;
    }
    let refreshAttempted = false;
    socket = io(SERVER_URL, { auth: (done) => done({ token: Cookies.get("accessToken")?.replace("Bearer ", "") }) }) as SeugiSocket;
    socket.on("connect", () => {
      refreshAttempted = false;
      for (const [roomId, listener] of listeners) {
        socket?.off("chat:message", listener);
        socket?.on("chat:message", listener);
        socket?.emit("room:join", roomId);
      }
      callback?.();
    });
    socket.on("connect_error", (error) => {
      console.error("소켓 연결 오류:", error);
      if (error.message !== "UNAUTHORIZED" || refreshAttempted) return;
      refreshAttempted = true;
      void withSeugiApi((api) => api.memberInfo()).then(() => socket?.connect()).catch(() => undefined);
    });
  },
  disconnect: () => { socket?.close(); socket = undefined; listeners.clear(); },
  sendMessage: (payload: string) => {
    if (!socket?.connected) return console.error("소켓이 연결되지 않았습니다.");
    try {
      const message = JSON.parse(payload) as ChatMessageInput;
      socket.emit("chat:message", message, (result: { message: string }) => {
        if (result.message !== "메시지 전송 성공") console.error(result.message);
      });
    } catch (error) { console.error(error); }
  },
  subscribeToMessages: (roomId: string, callback: (message: string) => void) => {
    const previousListener = listeners.get(roomId);
    if (previousListener) socket?.off("chat:message", previousListener);
    const listener = (message: ChatMessage) => {
      if (message.roomId === roomId) callback(JSON.stringify(message));
    };
    listeners.set(roomId, listener);
    if (!socket?.connected) { socketService.connect(); return; }
    socket.on("chat:message", listener);
    socket.emit("room:join", roomId);
  },
  unsubscribeFromMessages: (roomId: string) => {
    const listener = listeners.get(roomId);
    if (listener) socket?.off("chat:message", listener);
    listeners.delete(roomId);
    if (socket?.connected) socket.emit("room:leave", roomId);
  },
};
