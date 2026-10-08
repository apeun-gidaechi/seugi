import assert from "node:assert/strict";
import test from "node:test";
import { catseugiVisibleText } from "../src/utils/catseugi.ts";

test("mobile CatSeugi renderer resolves participant names in draw results", () => {
  const participants = [{ id: "m1", name: "가은" }];
  assert.equal(
    catseugiVisibleText(JSON.stringify({ keyword: "사람 뽑기", data: "사람을 1명 뽑았어요\n::m1::" }), participants),
    "사람을 1명 뽑았어요\n가은",
  );
});

test("mobile CatSeugi renderer falls back to raw text for non-JSON answers", () => {
  assert.equal(catseugiVisibleText("안녕하세요"), "안녕하세요");
});
