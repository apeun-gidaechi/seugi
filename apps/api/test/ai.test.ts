import assert from "node:assert/strict";
import test from "node:test";
import { answerSchoolQuestion, answerWithCatseugi } from "../src/ai.js";

test("Catseugi answers meal, timetable, and notice questions from school records", () => {
  assert.equal(answerSchoolQuestion("오늘 급식 뭐야?", { meals: [{ date: "2026-10-07", type: "중식", menu: ["김치볶음밥", "미역국"] }] }), "- 오늘의 중식\n김치볶음밥\n미역국");
  assert.equal(answerSchoolQuestion("오늘 급식 뭐야?", { meals: [{ date: "2026-10-07", type: "조식", menu: ["죽"] }, { date: "2026-10-07", type: "석식", menu: ["덮밥"] }] }), "- 오늘의 조식\n죽\n\n- 오늘의 석식\n덮밥");
  assert.equal(answerSchoolQuestion("오늘 시간표 알려줘", { timetable: [{ id: "p1", workspaceId: "w1", grade: "2", classNum: "4", time: "1", subject: "수학", date: "2026-10-07" }] }), "오늘의 시간표에요\n1교시 : 수학");
  assert.equal(answerSchoolQuestion("최근 공지 알려줘", { notifications: [{ id: "n1", workspaceId: "w1", title: "체육대회", content: "금요일", authorId: "m1", createdAt: "2026-10-07T00:00:00.000Z", emojis: {} }] }), "체육대회\n금요일");
  assert.equal(answerSchoolQuestion("오늘 급식 뭐야?", { meals: [] }), "오늘의 급식 없습니다.");
});

test("Catseugi picks real participants and forms balanced teams", () => {
  const members = ["가은", "나은", "다은", "라은"].map((name, index) => ({ id: `m${index}`, email: `${index}@example.com`, name }));
  assert.equal(answerSchoolQuestion("아무나 한 명 뽑아줘", { members }, () => 0.999), "가은님이 뽑혔어요!");
  assert.equal(answerSchoolQuestion("2팀으로 팀 짜줘", { members }, () => 0.5), "1조: 가은, 나은\n2조: 라은, 다은");
  assert.equal(answerSchoolQuestion("한 명 뽑아줘", { members: [] }), "참여자 정보를 확인할 수 없습니다.");
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
