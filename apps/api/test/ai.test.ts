import assert from "node:assert/strict";
import test from "node:test";
import { answerWithCatseugi } from "../src/ai.js";

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
