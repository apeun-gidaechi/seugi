import { useEffect, useState } from "react";
import { socketService } from "./socketService";
import type { ChatRoom } from "@/Components/common/ChatRoom";
import { getChatMessages } from "@/Api/chat";
import type { ChatMessage } from "@seugi/contracts";
import type { Message } from "@/Types/chat";

const adaptMessage = (message: ChatMessage): Message => ({
  id: message.id,
  uuid: message.id,
  chatRoomId: message.roomId,
  type: message.type,
  userId: message.senderId,
  message: message.message,
  emojiList: message.emojiList,
  mention: message.mention ?? [],
  mentionAll: message.mentionAll ?? false,
  eventList: [],
  timestamp: message.createdAt,
  messageStatus: message.messageStatus,
  files: message.files,
});

const mergeMessages = (current: Message[], incoming: Message[]) => {
  const byId = new Map<string, Message>();
  for (const message of [...current, ...incoming]) byId.set(message.id ?? message.uuid, message);
  return [...byId.values()].sort(
    (left, right) => Date.parse(left.timestamp ?? "") - Date.parse(right.timestamp ?? ""),
  );
};

const useChatMessages = (selectedRoom: ChatRoom) => {
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([]);

  useEffect(() => {
    const roomId = selectedRoom.id;
    let active = true;
    setReceivedMessages([]);

    socketService.subscribeToMessages(roomId, (message) => {
      const newMessage = adaptMessage(JSON.parse(message) as ChatMessage);
      if (active) setReceivedMessages((current) => mergeMessages(current, [newMessage]));
    });

    void getChatMessages(roomId)
      .then((response) => {
        const messages = response.messages.map(adaptMessage);
        if (active) setReceivedMessages((current) => mergeMessages(current, messages));
      })
      .catch((error) => console.error("Error fetching chat messages:", error));

    return () => {
      active = false;
      socketService.unsubscribeFromMessages(roomId);
    };
  }, [selectedRoom.id]);

  const sendMessage = (message: string, files: string[] = []) => {
    socketService.sendMessage(JSON.stringify({ roomId: selectedRoom.id, message, files }));
  };

  return {
    receivedMessages,
    sendMessage,
  };
};

export default useChatMessages;
