import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  API_SPEC,
  mealDateQuerySchema,
  mealRangeQuerySchema,
  monthScheduleQuerySchema,
  workspaceIdParamSchema,
  type Meal,
} from "@seugi/contracts";
import type { Store } from "../store.js";
import type { NeisClient } from "../neis.js";
import { ok, query } from "../http/helpers.js";

const workspaceParam = workspaceIdParamSchema;

export type SchoolRouteDeps = {
  store: Store;
  neis: NeisClient;
  auth: (request: FastifyRequest) => Promise<void>;
};

export function registerSchoolRoutes(
  app: FastifyInstance,
  deps: SchoolRouteDeps,
): { resetMeals: (workspaceId: string) => Promise<Meal[]> } {
  const { store, neis, auth } = deps;

  const mealsForMonth = async (
    workspaceId: string,
    year: number,
    month: number,
  ) => {
    const workspace = store.requireWorkspace(workspaceId);
    const from = `${year}${String(month).padStart(2, "0")}01`;
    const to = `${year}${String(month).padStart(2, "0")}${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
    return neis.meals(workspace, from, to);
  };

  const resetMeals = async (workspaceId: string) => {
    const today = new Date();
    const meals = await mealsForMonth(
      workspaceId,
      today.getFullYear(),
      today.getMonth() + 1,
    );
    store.meals.set(workspaceId, meals);
    return meals;
  };

  const resetSchedules = async (workspaceId: string) => {
    const schedules = await neis.schedules(
      store.requireWorkspace(workspaceId),
      new Date().getFullYear(),
    );
    store.schedules = [
      ...store.schedules.filter((item) => item.workspaceId !== workspaceId),
      ...schedules,
    ];
    return schedules;
  };

  app.get(API_SPEC.mealForDate.path, { preHandler: auth }, async (request) => {
    const { workspaceId, date } = query(mealDateQuerySchema, request);
    if (!store.canAccess(workspaceId, request.user.sub))
      throw new Error("권한이 없습니다");
    const meals =
      store.meals.get(workspaceId) ?? (await resetMeals(workspaceId));
    return ok(
      "날짜로 급식 조회 성공",
      meals.filter((meal) => meal.date === date),
    );
  });

  app.get(API_SPEC.meals.path, { preHandler: auth }, async (request) => {
    const input = query(mealRangeQuerySchema, request);
    if (!store.canAccess(input.workspaceId, request.user.sub))
      throw new Error("권한이 없습니다");
    if (input.year !== undefined && input.month !== undefined) {
      const now = new Date();
      if (
        input.year === now.getFullYear() &&
        input.month === now.getMonth() + 1
      )
        return ok(
          "모든 급식 조회 성공",
          store.meals.get(input.workspaceId) ??
            (await resetMeals(input.workspaceId)),
        );
      return ok(
        "모든 급식 조회 성공",
        await mealsForMonth(input.workspaceId, input.year, input.month),
      );
    }
    return ok(
      "모든 급식 조회 성공",
      store.meals.get(input.workspaceId) ??
        (await resetMeals(input.workspaceId)),
    );
  });

  app.post(API_SPEC.resetMeals.path, { preHandler: auth }, async (request) => {
    const workspaceId = workspaceParam.parse(request.params).workspaceId;
    if (!store.canAccess(workspaceId, request.user.sub))
      throw new Error("권한이 없습니다");
    await resetMeals(workspaceId);
    return ok("급식 저장 성공");
  });

  app.get(API_SPEC.schedules.path, { preHandler: auth }, async (request) => {
    const workspaceId = workspaceParam.parse(request.params).workspaceId;
    if (!store.canAccess(workspaceId, request.user.sub))
      throw new Error("권한이 없습니다");
    const schedules = store.schedules.filter(
      (item) => item.workspaceId === workspaceId,
    );
    return ok(
      "학사일정 전부 불러오기 성공",
      schedules.length ? schedules : await resetSchedules(workspaceId),
    );
  });

  app.get(
    API_SPEC.monthSchedules.path,
    { preHandler: auth },
    async (request) => {
      const input = query(monthScheduleQuerySchema, request);
      if (!store.canAccess(input.workspaceId, request.user.sub))
        throw new Error("권한이 없습니다");
      const all = store.schedules.filter(
        (item) => item.workspaceId === input.workspaceId,
      );
      const schedules = all.length
        ? all
        : await resetSchedules(input.workspaceId);
      return ok(
        "학사일정 한달치 불러오기 성공",
        schedules.filter(
          (item) => new Date(item.date).getMonth() + 1 === input.month,
        ),
      );
    },
  );

  return { resetMeals };
}
