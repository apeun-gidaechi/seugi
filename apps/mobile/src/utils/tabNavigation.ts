import type { Room } from "@seugi/contracts";

export type SeugiTab = "home" | "chat" | "group" | "notice" | "profile";

export function markTabVisited(visited: ReadonlySet<SeugiTab>, tab: SeugiTab): Set<SeugiTab> {
  return new Set(visited).add(tab);
}

export function updateTabConversation(
  conversations: Partial<Record<SeugiTab, Room>>,
  tab: SeugiTab,
  room?: Room,
): Partial<Record<SeugiTab, Room>> {
  if (room) return { ...conversations, [tab]: room };
  const remaining = { ...conversations };
  delete remaining[tab];
  return remaining;
}
