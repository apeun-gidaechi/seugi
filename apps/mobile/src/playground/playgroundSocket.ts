import type {
  ChatMessage,
  ChatMessageInput,
  ClientToServerEvents,
  ServerToClientEvents,
} from "@seugi/contracts";
import type { Socket } from "socket.io-client";
type SeugiSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const PLAYGROUND_SENDER_ID = "member-1";
type Handler = (...args: unknown[]) => void;

/** Minimal socket.io-shaped client for Playground chat (no realtime server). */
export function createPlaygroundSocket(): SeugiSocket {
  const handlers = new Map<string, Handler[]>();

  const emitTo = (event: string, ...args: unknown[]) => {
    for (const handler of handlers.get(event) ?? []) handler(...args);
  };

  const socket = {
    connected: false,
    active: true,
    auth: {},
    on(event: string, handler: Handler) {
      const list = handlers.get(event) ?? [];
      list.push(handler);
      handlers.set(event, list);
      return socket;
    },
    once(event: string, handler: Handler) {
      const wrapper: Handler = (...args) => {
        handler(...args);
        const list = handlers.get(event) ?? [];
        handlers.set(
          event,
          list.filter((item) => item !== wrapper),
        );
      };
      return socket.on(event, wrapper);
    },
    off(event: string, handler?: Handler) {
      if (!handler) {
        handlers.delete(event);
        return socket;
      }
      const list = handlers.get(event) ?? [];
      handlers.set(
        event,
        list.filter((item) => item !== handler),
      );
      return socket;
    },
    emit(event: string, ...args: unknown[]) {
      if (event === "room:join") return socket;
      if (event === "chat:message") {
        const input = args[0] as ChatMessageInput;
        const finish = args[1] as (result: { message: string }) => void;
        const message: ChatMessage = {
          id: `msg-${Date.now()}`,
          roomId: input.roomId,
          senderId: PLAYGROUND_SENDER_ID,
          message: input.message,
          files: input.files,
          type: input.type ?? "MESSAGE",
          createdAt: new Date().toISOString(),
          emojis: {},
        };
        queueMicrotask(() => {
          emitTo("chat:message", message);
          finish?.({ message: "메시지 전송 성공" });
        });
      }
      return socket;
    },
    connect() {
      socket.connected = true;
      queueMicrotask(() => emitTo("connect"));
      return socket;
    },
    close() {
      socket.connected = false;
      socket.active = false;
    },
  };

  queueMicrotask(() => socket.connect());

  return socket as SeugiSocket;
}
