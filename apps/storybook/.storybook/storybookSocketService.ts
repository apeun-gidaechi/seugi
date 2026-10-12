import type { ChatMessage, ChatMessageInput } from "@seugi/contracts";
import { storybookDemoMessages } from "./storybookApiFixtures";

const listeners = new Map<string, (message: ChatMessage) => void>();
const seededRooms = new Set<string>();
let connected = false;

function setConnected(next: boolean) {
  connected = next;
}

/** Drop-in replacement for web `socketService` in Storybook (no socket.io server). */
export const socketService = {
  connect: (callback?: () => void) => {
    if (!connected) {
      setConnected(true);
      for (const [roomId, listener] of listeners) {
        void roomId;
        void listener;
      }
    }
    callback?.();
  },
  disconnect: () => {
    setConnected(false);
    listeners.clear();
  },
  sendMessage: (payload: string) => {
    try {
      const input = JSON.parse(payload) as ChatMessageInput;
      const message: ChatMessage = {
        id: `msg-${Date.now()}`,
        roomId: input.roomId,
        senderId: "storybook-user",
        message: input.message,
        files: input.files,
        type: input.type ?? "MESSAGE",
        createdAt: new Date().toISOString(),
        emojis: {},
      };
      const listener = listeners.get(input.roomId);
      listener?.(message);
    } catch (error) {
      console.error(error);
    }
  },
  subscribeToMessages: (roomId: string, callback: (message: string) => void) => {
    const listener = (message: ChatMessage) => {
      if (message.roomId === roomId) callback(JSON.stringify(message));
    };
    listeners.set(roomId, listener);
    socketService.connect();
    if (!seededRooms.has(roomId)) {
      seededRooms.add(roomId);
      for (const seeded of storybookDemoMessages(roomId)) {
        callback(JSON.stringify(seeded));
      }
    }
  },
  unsubscribeFromMessages: (roomId: string) => {
    listeners.delete(roomId);
  },
};
