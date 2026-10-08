import type { FastifyInstance, FastifyRequest } from "fastify";
import { API_SPEC, aiPromptSchema, type Meal, type Role, type Timetable } from "@seugi/contracts";
import type { Store } from "../store.js";
import { answerSchoolQuestion, answerWithCatseugi, schoolQuestionIntent } from "../ai.js";
import { body, ok } from "../http/helpers.js";

type AiRouteDeps = {
  store: Store;
  auth: (request: FastifyRequest) => Promise<void>;
  localDateString: (date: Date) => string;
  resetMeals: (workspaceId: string) => Promise<Meal[]>;
  timetableForMember: (
    workspaceId: string,
    memberId: string,
    weekly: boolean,
    targetClass?: { grade: string; classNum: string },
  ) => Promise<Timetable[]>;
  roleIn: (workspace: { id: string; ownerId: string }, memberId: string) => Role | undefined;
};

export function registerAiRoutes(app: FastifyInstance, deps: AiRouteDeps) {
  const { store, auth, localDateString, resetMeals, timetableForMember, roleIn } = deps;

  app.post(API_SPEC.askCatseugi.path, { preHandler: auth }, async (request) => {
    const input = body(aiPromptSchema, request);
    if (!input.workspaceId) {
      return ok("캣스기답변", JSON.stringify({ keyword: "기타", data: await answerWithCatseugi(input.message) }));
    }
    if (!store.canAccess(input.workspaceId, request.user.sub)) {
      throw new Error("권한이 없습니다");
    }
    const intent = schoolQuestionIntent(input.message);
    const needsMeals = intent === "MEAL";
    const needsTimetable = intent === "TIMETABLE";
    const needsMembers = intent === "PICK_MEMBER" || intent === "MAKE_TEAMS";
    const today = localDateString(new Date());
    let meals = store.meals.get(input.workspaceId) ?? [];
    if (needsMeals && !store.meals.has(input.workspaceId)) {
      try {
        meals = await resetMeals(input.workspaceId);
      } catch {
        meals = [];
      }
    }
    const timetable = needsTimetable
      ? await timetableForMember(input.workspaceId, request.user.sub, false)
      : [];
    const notifications = [...store.notifications.values()]
      .filter((item) => item.workspaceId === input.workspaceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((item) => ({ ...item, userName: store.members.get(item.authorId)?.name }));
    let members: ReturnType<typeof store.requireMember>[] = [];
    if (needsMembers) {
      const workspace = store.requireWorkspace(input.workspaceId);
      const profile = store.profiles.get(`${workspace.id}:${request.user.sub}`);
      const requestedClass = input.message.match(/(\d+)\s*학년\s*(\d+)\s*반/);
      const grade = requestedClass?.[1] ?? (profile?.grade ? String(profile.grade) : undefined);
      const classNum = requestedClass?.[2] ?? (profile?.class ? String(profile.class) : undefined);
      members = workspace.members
        .filter((memberId) => roleIn(workspace, memberId) === "STUDENT")
        .filter((memberId) => {
          const studentProfile = store.profiles.get(`${workspace.id}:${memberId}`);
          return (
            (!grade || studentProfile?.grade === Number(grade)) &&
            (!classNum || studentProfile?.class === Number(classNum))
          );
        })
        .map((memberId) => store.requireMember(memberId));
    }
    const schoolAnswer = answerSchoolQuestion(input.message, {
      meals: meals.filter((item) => item.date.slice(0, 10) === today),
      timetable,
      notifications,
      members,
    });
    const answer = schoolAnswer ?? { keyword: "기타", data: await answerWithCatseugi(input.message) };
    return ok("캣스기답변", JSON.stringify(answer));
  });
}
