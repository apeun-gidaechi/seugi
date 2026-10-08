// Reuse only the localized data file already used by the web emoji picker. The
// browser picker component itself is never imported into the native bundle.
import koreanEmojiData from "emoji-picker-react/src/data/emojis-ko";
import { emojiFromUnified, filterEmojiEntries, type EmojiCategoryId, type EmojiCatalogEntry } from "./emojiCatalogCore";

type EmojiRecord = { n: string[]; u: string; v?: string[] };
type EmojiDataFile = { emojis: Record<string, EmojiRecord[]> };

const localizedData = koreanEmojiData as unknown as EmojiDataFile;

export const EMOJI_CATEGORIES = [
  { id: "smileys_people", label: "표정·사람", symbol: "😀" },
  { id: "animals_nature", label: "동물·자연", symbol: "🐻" },
  { id: "food_drink", label: "음식·음료", symbol: "🍎" },
  { id: "travel_places", label: "여행·장소", symbol: "✈️" },
  { id: "activities", label: "활동", symbol: "⚽" },
  { id: "objects", label: "사물", symbol: "💡" },
  { id: "symbols", label: "기호", symbol: "❤️" },
  { id: "flags", label: "깃발", symbol: "🏳️" },
] as const satisfies ReadonlyArray<{ id: string; label: string; symbol: string }>;

export type { EmojiCategoryId, EmojiCatalogEntry } from "./emojiCatalogCore";

export const EMOJI_CATALOG: EmojiCatalogEntry[] = EMOJI_CATEGORIES.flatMap(({ id }) =>
  (localizedData.emojis[id] ?? []).flatMap(({ n, u, v }) => [u, ...(v ?? [])].map((unified) => ({
    emoji: emojiFromUnified(unified),
    names: n,
    category: id,
  }))),
);

export function filterEmojiCatalog(category: EmojiCategoryId, query: string): EmojiCatalogEntry[] {
  return filterEmojiEntries(EMOJI_CATALOG, category, query);
}
