export function chatRoomName(
  roomType: "GROUP" | "PERSONAL",
  roomName: string,
  members: Array<{ id: string; name: string }>,
  currentMemberId: string,
) {
  if (roomType === "GROUP") return roomName;
  return members
    .filter((member) => member.id !== currentMemberId)
    .map((member) => member.name)
    .join(", ");
}
