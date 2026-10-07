import assert from "node:assert/strict";
import test from "node:test";
import { answerSchoolQuestion, answerWithCatseugi } from "../src/ai.js";

test("Catseugi answers meal, timetable, and notice questions from school records", () => {
  assert.equal(answerSchoolQuestion("오늘 급식 뭐야?", { meals: [{ date: "2026-10-07", type: "중식", menu: ["김치볶음밥", "미역국"] }] }), "중식\n김치볶음밥\n미역국");
  assert.equal(answerSchoolQuestion("오늘 시간표 알려줘", { timetable: [{ id: "p1", workspaceId: "w1", grade: "2", classNum: "4", time: "1", subject: "수학", date: "2026-10-07" }] }), "1교시 · 수학");
  assert.equal(answerSchoolQuestion("최근 공지 알려줘", { notifications: [{ id: "n1", workspaceId: "w1", title: "체육대회", content: "금요일", authorId: "m1", createdAt: "2026-10-07T00:00:00.000Z", emojis: {} }] }), "체육대회\n금요일");
  assert.equal(answerSchoolQuestion("오늘 급식 뭐야?", { meals: [] }), "오늘 등록된 급식 정보가 없습니다.");
});

test("Catseugi sends a non-retained Responses API request and extracts output text", async () => {
  const previous = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = "test-key";
  let request: RequestInit | undefined;
  try {
    const answer = await answerWithCatseugi("내일 준비물을 알려줘", async (_url, init) => { request = init; return new Response(JSON.stringify({ output: [{ type: "message", content: [{ type: "output_text", text: "선생님 공지를 확인해 보세요." }] }] }), { status: 200 }); });
    assert.equal(answer, "선생님 공지를 확인해 보세요.");
    assert.equal(JSON.parse(request?.body as string).store, false);
    assert.equal((request?.headers as Record<string, string>).authorization, "Bearer test-key");
  } finally { if (previous === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previous; }
});

test("Catseugi requires an API key", async () => {
  const previous = process.env.OPENAI_API_KEY; delete process.env.OPENAI_API_KEY;
  try { await assert.rejects(() => answerWithCatseugi("안녕"), /AI_NOT_CONFIGURED/); }
  finally { if (previous !== undefined) process.env.OPENAI_API_KEY = previous; }
});
