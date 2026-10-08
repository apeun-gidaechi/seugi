import assert from "node:assert/strict";
import test from "node:test";
import { emojiFromUnified, filterEmojiEntries, type EmojiCatalogEntry } from "../src/utils/emojiCatalogCore.ts";

const catalog: EmojiCatalogEntry[] = [
  { emoji: "❤️", names: ["하트", "사랑", "빨간 하트"], category: "symbols" },
  { emoji: "👍", names: ["좋아요", "엄지"], category: "smileys_people" },
  { emoji: "🐈", names: ["고양이"], category: "animals_nature" },
];

test("emoji unified codepoints reconstruct emoji sequences and skin tones", () => {
  assert.equal(emojiFromUnified("1f469-1f3fd-200d-1f4bb"), "👩🏽‍💻");
  assert.equal(emojiFromUnified("2764-fe0f"), "❤️");
});

test("emoji category selection only displays entries in the selected category", () => {
  assert.deepEqual(filterEmojiEntries(catalog, "animals_nature", "").map(({ emoji }) => emoji), ["🐈"]);
});

test("Korean emoji search matches localized names across categories", () => {
  assert.deepEqual(filterEmojiEntries(catalog, "flags", " 사랑 ").map(({ emoji }) => emoji), ["❤️"]);
});

test("empty Korean emoji search returns the active category", () => {
  assert.deepEqual(filterEmojiEntries(catalog, "smileys_people", "   ").map(({ emoji }) => emoji), ["👍"]);
});
