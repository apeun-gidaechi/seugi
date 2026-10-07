import { randomInt } from "node:crypto";
import type { Meal, Member, Notification, Timetable } from "@seugi/contracts";

type ResponsePayload = {
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
};

export type CatseugiSchoolContext = {
  meals?: Meal[];
  timetable?: Timetable[];
  notifications?: Notification[];
  members?: Member[];
};

export type CatseugiSchoolIntent = "MEAL" | "TIMETABLE" | "NOTICE" | "PICK_MEMBER" | "MAKE_TEAMS";

export function schoolQuestionIntent(message: string): CatseugiSchoolIntent | undefined {
  const question = message.toLocaleLowerCase("ko-KR");
  if (/팀.{0,8}(?:짜|만들|나눠)|조.{0,8}(?:짜|만들|나눠)|\d+\s*명씩.{0,8}(?:팀|조)/.test(question)) return "MAKE_TEAMS";
  if (/사람.{0,6}(?:뽑|골라)|(?:아무나|랜덤).{0,10}(?:한\s*명|사람|뽑)|누구.{0,8}(?:뽑|골라)|뽑아(?:줘|주세요)?|골라(?:줘|주세요)?/.test(question)) return "PICK_MEMBER";
  if (/급식|메뉴|점심|저녁|아침/.test(question)) return "MEAL";
  if (/시간표|몇\s*교시|수업.{0,8}(?:뭐|어때|알려|있)/.test(question)) return "TIMETABLE";
  if (/공지|학교 행사|학교 소식/.test(question)) return "NOTICE";
  return undefined;
}

/** Resolve source-supported school-data intents without allowing the model to invent records. */
export function answerSchoolQuestion(message: string, context: CatseugiSchoolContext, random: () => number = () => randomInt(1_000_000) / 1_000_000) {
  const intent = schoolQuestionIntent(message);
  if (intent === "MEAL") {
    const meals = context.meals ?? [];
    return meals.length
      ? meals.map((meal) => `${meal.type}${meal.calorie ? ` (${meal.calorie})` : ""}\n${meal.menu.join("\n")}`).join("\n\n")
      : "오늘 등록된 급식 정보가 없습니다.";
  }
  if (intent === "TIMETABLE") {
    const periods = context.timetable ?? [];
    return periods.length
      ? periods.map((period) => `${period.time}교시 · ${period.subject}`).join("\n")
      : "오늘 확인할 수 있는 시간표가 없습니다. 프로필의 학년과 반 정보가 등록되어 있는지 확인해 주세요.";
  }
  if (intent === "NOTICE") {
    const latest = context.notifications?.[0];
    return latest ? `${latest.title}\n${latest.content}` : "등록된 공지가 없습니다.";
  }
  if (intent === "PICK_MEMBER" || intent === "MAKE_TEAMS") {
    const members = [...(context.members ?? [])];
    if (!members.length) return "참여자 정보를 확인할 수 없습니다.";
    for (let index = members.length - 1; index > 0; index--) {
      const target = Math.min(index, Math.floor(random() * (index + 1)));
      [members[index], members[target]] = [members[target]!, members[index]!];
    }
    if (intent === "PICK_MEMBER") return `${members[0]!.name}님이 뽑혔어요!`;
    const requestedPerTeam = message.match(/(\d+)\s*명씩/);
    const requestedTeams = message.match(/(\d+)\s*(?:팀|조)/);
    const perTeam = requestedPerTeam ? Math.max(1, Number(requestedPerTeam[1])) : undefined;
    const teamCount = perTeam ? Math.ceil(members.length / perTeam) : Math.max(1, Math.min(members.length, requestedTeams ? Number(requestedTeams[1]) : 2));
    const teams = Array.from({ length: teamCount }, () => [] as Member[]);
    members.forEach((member, index) => teams[index % teamCount]!.push(member));
    return teams.map((team, index) => `${index + 1}조: ${team.map((member) => member.name).join(", ")}`).join("\n");
  }
  return undefined;
}

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
