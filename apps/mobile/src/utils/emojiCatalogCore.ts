export type EmojiCategoryId =
  | "smileys_people"
  | "animals_nature"
  | "food_drink"
  | "travel_places"
  | "activities"
  | "objects"
  | "symbols"
  | "flags";

export type EmojiCatalogEntry = {
  emoji: string;
  names: string[];
  category: EmojiCategoryId;
};

export function emojiFromUnified(unified: string): string {
  return unified
    .split("-")
    .map((codepoint) => String.fromCodePoint(Number.parseInt(codepoint, 16)))
    .join("");
}

export function filterEmojiEntries(
  catalog: EmojiCatalogEntry[],
  category: EmojiCategoryId,
  query: string,
): EmojiCatalogEntry[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  return catalog.filter((entry) => {
    if (normalizedQuery)
      return entry.names.some((name) => name.toLocaleLowerCase("ko-KR").includes(normalizedQuery));
    return entry.category === category;
  });
}
