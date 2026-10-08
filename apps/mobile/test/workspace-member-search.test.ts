import assert from "node:assert/strict";
import test from "node:test";
import { matchesIosKoreanPrefixSearch } from "../src/utils/koreanSearch.ts";

test("iOS member search matches native Hangul initial and partial-prefix queries", () => {
  const nameAndNick = "홍길동 (세종대왕)";
  assert.equal(matchesIosKoreanPrefixSearch(nameAndNick, "ㅎㄱㄷ"), true);
  assert.equal(matchesIosKoreanPrefixSearch(nameAndNick, "홍길"), true);
  assert.equal(matchesIosKoreanPrefixSearch(nameAndNick, "세종"), false);
  assert.equal(matchesIosKoreanPrefixSearch(nameAndNick, "ㅎㄱㄷ "), false);
});
