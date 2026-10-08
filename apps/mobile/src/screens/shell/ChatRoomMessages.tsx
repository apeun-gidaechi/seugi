import type { Room } from "@seugi/contracts";
import { ChatConversationScreen } from "../ChatConversationScreen";
import type { ChatImagePreview } from "../ChatScreen";

export function ChatRoomMessages({
  room,
  onBack,
  onOpenRoom,
  onPreviewImage,
}: {
  room: Room;
  onBack: () => void;
  onOpenRoom: (room: Room) => void;
  onPreviewImage: (image: ChatImagePreview) => void;
}) {
  return (
    <ChatConversationScreen
      room={room}
      onBack={onBack}
      onOpenRoom={onOpenRoom}
      onPreviewImage={onPreviewImage}
    />
  );
}
