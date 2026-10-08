import { randomInt } from "node:crypto";
import type { Meal, Member, Notification, Timetable } from "@seugi/contracts";

type ResponsePayload = {
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
};

export type CatseugiSchoolContext = {
  meals?: Meal[];
  timetable?: Timetable[];
  notifications?: Array<Notification & { userName?: string }>;
  members?: Member[];
};

export type CatseugiSchoolIntent = "MEAL" | "TIMETABLE" | "NOTICE" | "PICK_MEMBER" | "MAKE_TEAMS";
export type CatseugiAnswer = {
  keyword: "급식" | "시간표" | "공지" | "사람 뽑기" | "팀짜기";
  data: unknown;
};

export function schoolQuestionIntent(message: string): CatseugiSchoolIntent | undefined {
  const question = message.toLocaleLowerCase("ko-KR");
  if (/팀.{0,8}(?:짜|만들|나눠)|조.{0,8}(?:짜|만들|나눠)|\d+\s*명씩.{0,8}(?:팀|조)/.test(question))
    return "MAKE_TEAMS";
  if (
    /(?:사람|학생|친구|조원|팀원).{0,8}(?:뽑|골라)|(?:아무나|랜덤).{0,10}(?:한\s*명|사람|뽑)|누구.{0,8}(?:뽑|골라)|뽑(?:아|기)(?:줘|주세요)?|골라(?:줘|주세요)?/.test(
      question,
    )
  )
    return "PICK_MEMBER";
  if (/급식|메뉴|점심|저녁|아침/.test(question)) return "MEAL";
  if (/시간표|(?:몇|\d+)\s*교시|수업.{0,8}(?:뭐|어때|알려|있)/.test(question)) return "TIMETABLE";
  if (/공지|행사|학교\s*소식|가정통신문|학사\s*일정|학교\s*일정/.test(question)) return "NOTICE";
  return undefined;
}

/** Resolve source-supported school-data intents without allowing the model to invent records. */
export function answerSchoolQuestion(
  message: string,
  context: CatseugiSchoolContext,
  random: () => number = () => randomInt(1_000_000) / 1_000_000,
) {
  const intent = schoolQuestionIntent(message);
  if (intent === "MEAL") {
    const meals = context.meals ?? [];
    const category = (type: string) => {
      switch (type.toLocaleUpperCase("ko-KR")) {
        case "조식":
        case "아침":
        case "BREAKFAST":
          return "조식";
        case "중식":
        case "점심":
        case "LUNCH":
          return "중식";
        case "석식":
        case "저녁":
        case "DINNER":
          return "석식";
        default:
          return type;
      }
    };
    return {
      keyword: "급식",
      data: meals.map((meal) => ({
        mealDate: meal.date,
        mealType: category(meal.type),
        menu: meal.menu,
        calorie: meal.calorie ?? null,
        mealInfo: [],
      })),
    } satisfies CatseugiAnswer;
  }
  if (intent === "TIMETABLE") {
    const periods = context.timetable ?? [];
    return { keyword: "시간표", data: periods } satisfies CatseugiAnswer;
  }
  if (intent === "NOTICE") {
    const latest = context.notifications?.[0];
    return {
      keyword: "공지",
      data: latest
        ? [
            {
              id: latest.id,
              workspaceId: latest.workspaceId,
              userId: latest.authorId,
              userName: latest.userName,
              title: latest.title,
              content: latest.content,
              creationDate: latest.createdAt,
            },
          ]
        : [],
    } satisfies CatseugiAnswer;
  }
  if (intent === "PICK_MEMBER" || intent === "MAKE_TEAMS") {
    const members = [...(context.members ?? [])];
    if (!members.length)
      return {
        keyword: intent === "PICK_MEMBER" ? "사람 뽑기" : "팀짜기",
        data: "참여자 정보를 확인할 수 없습니다.",
      } satisfies CatseugiAnswer;
    for (let index = members.length - 1; index > 0; index--) {
      const target = Math.min(index, Math.floor(random() * (index + 1)));
      [members[index], members[target]] = [members[target]!, members[index]!];
    }
    if (intent === "PICK_MEMBER")
      return {
        keyword: "사람 뽑기",
        data: `사람을 1명 뽑았어요\n::${members[0]!.id}::`,
      } satisfies CatseugiAnswer;
    const requestedPerTeam = message.match(/(\d+)\s*명씩/);
    const requestedTeams = message.match(/(\d+)\s*(?:팀|조)/);
    const perTeam = requestedPerTeam ? Math.max(1, Number(requestedPerTeam[1])) : undefined;
    const teamCount = perTeam
      ? Math.ceil(members.length / perTeam)
      : Math.max(1, Math.min(members.length, requestedTeams ? Number(requestedTeams[1]) : 2));
    const teams = Array.from({ length: teamCount }, () => [] as Member[]);
    members.forEach((member, index) => teams[index % teamCount]!.push(member));
    return {
      keyword: "팀짜기",
      data: teams
        .map(
          (team, index) => `${index + 1}조: ${team.map((member) => `::${member.id}::`).join(", ")}`,
        )
        .join("\n"),
    } satisfies CatseugiAnswer;
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
      instructions:
        "You are 캣스기, a kind Korean school-workspace assistant. Answer accurately and concisely in Korean. Do not invent school notices, schedules, grades, or personal data.",
      input: message,
      max_output_tokens: 700,
      store: false,
    }),
  });
  if (!response.ok) throw new Error("AI_PROVIDER_REQUEST_FAILED");
  const payload = (await response.json()) as ResponsePayload;
  const text = payload.output
    ?.flatMap((item) => (item.type === "message" ? (item.content ?? []) : []))
    .find((item) => item.type === "output_text")?.text;
  if (!text) throw new Error("AI_PROVIDER_EMPTY_RESPONSE");
  return text;
}
