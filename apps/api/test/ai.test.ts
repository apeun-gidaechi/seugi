import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { Store } from "../src/store.js";
import { answerSchoolQuestion, answerWithCatseugi } from "../src/ai.js";
import { catseugiVisibleText } from "../../mobile/src/utils/catseugi.js";

test("Catseugi answers meal, timetable, and notice questions from school records", () => {
  assert.deepEqual(answerSchoolQuestion("오늘 급식 뭐야?", { meals: [{ date: "2026-10-07", type: "중식", menu: ["김치볶음밥", "미역국"] }] }), {
    keyword: "급식", data: [{ mealDate: "2026-10-07", mealType: "중식", menu: ["김치볶음밥", "미역국"], calorie: null, mealInfo: [] }],
  });
  assert.deepEqual(answerSchoolQuestion("오늘 시간표 알려줘", { timetable: [{ id: "p1", workspaceId: "w1", grade: "2", classNum: "4", time: "1", subject: "수학", date: "2026-10-07" }] }), {
    keyword: "시간표", data: [{ id: "p1", workspaceId: "w1", grade: "2", classNum: "4", time: "1", subject: "수학", date: "2026-10-07" }],
  });
  assert.deepEqual(answerSchoolQuestion("최근 공지 알려줘", { notifications: [{ id: "n1", workspaceId: "w1", title: "체육대회", content: "금요일", authorId: "m1", userName: "홍길동", createdAt: "2026-10-07T00:00:00.000Z", emojis: {} }] }), {
    keyword: "공지", data: [{ id: "n1", workspaceId: "w1", userId: "m1", userName: "홍길동", title: "체육대회", content: "금요일", creationDate: "2026-10-07T00:00:00.000Z" }],
  });
  assert.equal(answerSchoolQuestion("8월 행사 알려줘", { notifications: [{ id: "n1", workspaceId: "w1", title: "체육대회", content: "금요일", authorId: "m1", createdAt: "2026-10-07T00:00:00.000Z", emojis: {} }] })?.keyword, "공지");
  assert.deepEqual(answerSchoolQuestion("오늘 급식 뭐야?", { meals: [] }), { keyword: "급식", data: [] });
});

test("Catseugi picks real participants and forms balanced teams", () => {
  const members = ["가은", "나은", "다은", "라은"].map((name, index) => ({ id: `m${index}`, email: `${index}@example.com`, name }));
  assert.deepEqual(answerSchoolQuestion("아무나 한 명 뽑아줘", { members }, () => 0.999), { keyword: "사람 뽑기", data: "사람을 1명 뽑았어요\n::m0::" });
  assert.deepEqual(answerSchoolQuestion("2팀으로 팀 짜줘", { members }, () => 0.5), { keyword: "팀짜기", data: "1조: ::m0::, ::m1::\n2조: ::m3::, ::m2::" });
  assert.deepEqual(answerSchoolQuestion("한 명 뽑아줘", { members: [] }), { keyword: "사람 뽑기", data: "참여자 정보를 확인할 수 없습니다." });
});

test("Catseugi recognizes natural school questions without canonical feature names", () => {
  assert.equal(answerSchoolQuestion("오늘 3교시 뭐야?", { timetable: [] })?.keyword, "시간표");
  assert.equal(answerSchoolQuestion("이번 주 가정통신문 알려줘", { notifications: [] })?.keyword, "공지");
  assert.equal(answerSchoolQuestion("조원 한 명 뽑기", { members: [{ id: "m1", email: "m@example.com", name: "가은" }] })?.keyword, "사람 뽑기");
});

test("mobile Catseugi renderer presents native structured school-answer payloads", () => {
  assert.equal(catseugiVisibleText(JSON.stringify({ keyword: "급식", data: [{ mealType: "중식", menu: ["김치볶음밥", "미역국"] }] })), "- 오늘의 중식\n김치볶음밥\n미역국");
  assert.equal(catseugiVisibleText(JSON.stringify({ keyword: "시간표", data: [{ time: "1", subject: "수학" }] })), "오늘의 시간표에요\n1교시 : 수학");
  assert.equal(catseugiVisibleText(JSON.stringify({ keyword: "공지", data: [{ userName: "홍길동", title: "체육대회", content: "금요일" }] })), "홍길동 선생님이 공지를 작성하셨어요\n제목: 체육대회금요일");
  const participants = [{ id: "m0", name: "가은" }, { id: "m1", name: "나은" }, { id: "m2", name: "다은" }];
  assert.equal(catseugiVisibleText(JSON.stringify({ keyword: "사람 뽑기", data: "사람을 1명 뽑았어요\n::m1::" }), participants), "사람을 1명 뽑았어요\n나은");
  assert.equal(catseugiVisibleText(JSON.stringify({ keyword: "팀짜기", data: "1조: ::m0::, ::m1::\n2조: ::m2::" }), participants), "1조: 가은, 나은\n2조: 다은");
  assert.equal(catseugiVisibleText(JSON.stringify({ keyword: "기타", data: "반가워요." })), "반가워요.");
});

test("Catseugi API retains the original JSON keyword/data response envelope", async () => {
  const store = new Store();
  const app = await buildApp(store);
  store.emailCodes.set("catseugi-envelope@example.com", { code: "123456", expiresAt: Date.now() + 60_000 });
  try {
    const registration = await app.inject({ method: "POST", url: "/member/register", payload: { email: "catseugi-envelope@example.com", password: "password123", code: "123456" } });
    const token = registration.json().data.accessToken as string;
    const authorization = { authorization: `Bearer ${token}` };
    const workspaceId = (await app.inject({ method: "POST", url: "/workspace", headers: authorization, payload: { name: "Catseugi 학교" } })).json().data as string;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    store.meals.set(workspaceId, [{ date: today, type: "중식", menu: ["김치볶음밥"] }]);
    const response = await app.inject({ method: "POST", url: "/ai", headers: authorization, payload: { workspaceId, message: "오늘 급식 뭐야?" } });
    assert.equal(response.statusCode, 200);
    const answer = JSON.parse(response.json().data as string) as { keyword: string; data: Array<{ menu: string[] }> };
    assert.equal(answer.keyword, "급식");
    assert.deepEqual(answer.data[0]?.menu, ["김치볶음밥"]);
  } finally { await app.close(); }
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
