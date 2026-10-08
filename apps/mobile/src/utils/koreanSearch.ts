const koreanInitials = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];
const koreanVowels = [
  "ㅏ",
  "ㅐ",
  "ㅑ",
  "ㅒ",
  "ㅓ",
  "ㅔ",
  "ㅕ",
  "ㅖ",
  "ㅗ",
  "ㅘ",
  "ㅙ",
  "ㅚ",
  "ㅛ",
  "ㅜ",
  "ㅝ",
  "ㅞ",
  "ㅟ",
  "ㅠ",
  "ㅡ",
  "ㅢ",
  "ㅣ",
];
const koreanFinals = [
  "",
  "ㄱ",
  "ㄲ",
  "ㄳ",
  "ㄴ",
  "ㄵ",
  "ㄶ",
  "ㄷ",
  "ㄹ",
  "ㄺ",
  "ㄻ",
  "ㄼ",
  "ㄽ",
  "ㄾ",
  "ㄿ",
  "ㅀ",
  "ㅁ",
  "ㅂ",
  "ㅄ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];

function initialQuery(query: string) {
  return query.length > 0 && [...query].every((character) => koreanInitials.includes(character));
}

function initialsOf(value: string) {
  return [...value]
    .flatMap((character) => {
      const code = character.codePointAt(0) ?? 0;
      if (code < 0xac00 || code > 0xd7a3) return [];
      return [koreanInitials[Math.floor((code - 0xac00) / 588)] ?? ""];
    })
    .join("");
}

function decomposeKorean(value: string) {
  return [...value]
    .map((character) => {
      const syllable = (character.codePointAt(0) ?? 0) - 0xac00;
      if (syllable < 0 || syllable >= 11172) return character;
      const initial = Math.floor(syllable / (21 * 28));
      const vowel = Math.floor((syllable % (21 * 28)) / 28);
      const final = syllable % 28;
      return `${koreanInitials[initial]}${koreanVowels[vowel]}${koreanFinals[final]}`;
    })
    .join("");
}

/** Matches iOS Searchable: Hangul initial or partial-jamo prefix, otherwise literal prefix. */
export function matchesIosKoreanPrefixSearch(value: string, query: string) {
  if (query.length === 0) return true;
  if (initialQuery(query)) return initialsOf(value).startsWith(query) || value.startsWith(query);
  return decomposeKorean(value).startsWith(decomposeKorean(query)) || value.startsWith(query);
}
