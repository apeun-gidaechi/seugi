type ResponsePayload = {
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
};

/** Calls the Responses API without retaining a student's prompt on the provider. */
export async function answerWithCatseugi(message: string, fetcher: typeof fetch = fetch) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("AI_NOT_CONFIGURED");
  const response = await fetcher("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-6-astra",
      instructions: "You are 캣스기, a kind Korean school-workspace assistant. Answer accurately and concisely in Korean. Do not invent school notices, schedules, grades, or personal data.",
      input: message,
      max_output_tokens: 700,
      store: false,
    }),
  });
  if (!response.ok) throw new Error("AI_PROVIDER_REQUEST_FAILED");
  const payload = await response.json() as ResponsePayload;
  const text = payload.output?.flatMap((item) => item.type === "message" ? item.content ?? [] : []).find((item) => item.type === "output_text")?.text;
  if (!text) throw new Error("AI_PROVIDER_EMPTY_RESPONSE");
  return text;
}
