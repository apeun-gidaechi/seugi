import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  API_SPEC,
  createTimetableSchema,
  idParamSchema,
  profileWorkspaceQuerySchema,
  timetableQuerySchema,
  updateTimetableSchema,
  type Role,
  type Timetable,
} from "@seugi/contracts";
import type { Store } from "../store.js";
import type { NeisClient } from "../neis.js";
import { body, ok, query } from "../http/helpers.js";
import { localDateString, schoolWeekRange } from "../school/dates.js";

const idParam = idParamSchema;
const teacherRoles = ["ADMIN", "MIDDLE_ADMIN", "TEACHER"];

export type TimetableRouteDeps = {
  store: Store;
  neis: NeisClient;
  auth: (request: FastifyRequest) => Promise<void>;
  roleIn: (
    workspace: { id: string; ownerId: string },
    memberId: string,
  ) => Role | undefined;
};

export function registerTimetableRoutes(
  app: FastifyInstance,
  deps: TimetableRouteDeps,
): {
  timetableForMember: (
    workspaceId: string,
    memberId: string,
    weekly: boolean,
    targetClass?: { grade: string; classNum: string },
  ) => Promise<Timetable[]>;
} {
  const { store, neis, auth, roleIn } = deps;

  const resetTimetable = async (workspaceId: string) => {
    const workspace = store.requireWorkspace(workspaceId);
    const [fromDate, toDate] = schoolWeekRange();
    const from = fromDate.replaceAll("-", "");
    const to = toDate.replaceAll("-", "");
    const rows = await neis.timetables(workspace, from, to);
    for (const [id, entry] of store.timetables)
      if (entry.workspaceId === workspaceId) store.timetables.delete(id);
    for (const entry of rows) {
      const id = store.id();
      store.timetables.set(id, { ...entry, id });
    }
  };

  const timetableForMember = async (
    workspaceId: string,
    memberId: string,
    weekly: boolean,
    targetClass?: { grade: string; classNum: string },
  ) => {
    if (!store.canAccess(workspaceId, memberId))
      throw new Error("권한이 없습니다");
    let rows = [...store.timetables.values()].filter(
      (entry) => entry.workspaceId === workspaceId,
    );
    if (!rows.length && process.env.NEIS_API_KEY) {
      await resetTimetable(workspaceId);
      rows = [...store.timetables.values()].filter(
        (entry) => entry.workspaceId === workspaceId,
      );
    }
    if (targetClass) {
      const role = roleIn(store.requireWorkspace(workspaceId), memberId);
      if (!teacherRoles.includes(role ?? ""))
        throw new Error("권한이 없습니다");
      rows = rows.filter(
        (entry) =>
          entry.grade === targetClass.grade &&
          entry.classNum === targetClass.classNum,
      );
    } else {
      const profile = store.profiles.get(`${workspaceId}:${memberId}`);
      if (!profile?.grade || !profile.class) return [];
      rows = rows.filter(
        (entry) =>
          entry.grade === String(profile.grade) &&
          entry.classNum === String(profile.class),
      );
    }
    if (!weekly) {
      const today = localDateString(new Date());
      return rows
        .filter((entry) => entry.date === today)
        .sort((a, b) => Number(a.time) - Number(b.time));
    }
    const [from, to] = schoolWeekRange();
    return rows
      .filter((entry) => entry.date >= from && entry.date <= to)
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) || Number(a.time) - Number(b.time),
      );
  };

  app.post(
    API_SPEC.createTimetable.path,
    { preHandler: auth },
    async (request) => {
      const input = body(createTimetableSchema, request);
      const workspace = store.requireWorkspace(input.workspaceId);
      if (
        !workspace.members.includes(request.user.sub) ||
        !teacherRoles.includes(roleIn(workspace, request.user.sub) ?? "")
      )
        throw new Error("권한이 없습니다");
      const entry: Timetable = { id: store.id(), ...input };
      store.timetables.set(entry.id, entry);
      return ok("시간표 저장 성공!");
    },
  );

  app.patch(
    API_SPEC.updateTimetable.path,
    { preHandler: auth },
    async (request) => {
      const input = body(updateTimetableSchema, request);
      const entry = store.timetables.get(input.id);
      if (!entry) throw new Error("TIMETABLE_NOT_FOUND");
      const workspace = store.requireWorkspace(entry.workspaceId);
      if (
        !workspace.members.includes(request.user.sub) ||
        !teacherRoles.includes(roleIn(workspace, request.user.sub) ?? "")
      )
        throw new Error("권한이 없습니다");
      entry.subject = input.subject;
      return ok("시간표 수정 성공!");
    },
  );

  app.delete(
    API_SPEC.deleteTimetable.path,
    { preHandler: auth },
    async (request) => {
      const entry = store.timetables.get(idParam.parse(request.params).id);
      if (!entry) throw new Error("TIMETABLE_NOT_FOUND");
      const workspace = store.requireWorkspace(entry.workspaceId);
      if (
        !workspace.members.includes(request.user.sub) ||
        !teacherRoles.includes(roleIn(workspace, request.user.sub) ?? "")
      )
        throw new Error("권한이 없습니다");
      store.timetables.delete(entry.id);
      return ok("시간표 삭제 성공");
    },
  );

  app.post(
    API_SPEC.resetTimetable.path,
    { preHandler: auth },
    async (request) => {
      const workspaceId = query(
        profileWorkspaceQuerySchema,
        request,
      ).workspaceId;
      if (!store.canAccess(workspaceId, request.user.sub))
        throw new Error("권한이 없습니다");
      await resetTimetable(workspaceId);
      return ok("시간표 재설정 완료");
    },
  );

  app.get(
    API_SPEC.weeklyTimetable.path,
    { preHandler: auth },
    async (request) => {
      const input = query(timetableQuerySchema, request);
      return ok(
        "시간표 조회 성공",
        await timetableForMember(
          input.workspaceId,
          request.user.sub,
          true,
          input.grade && input.classNum
            ? { grade: input.grade, classNum: input.classNum }
            : undefined,
        ),
      );
    },
  );

  app.get(
    API_SPEC.dailyTimetable.path,
    { preHandler: auth },
    async (request) => {
      const workspaceId = query(
        profileWorkspaceQuerySchema,
        request,
      ).workspaceId;
      return ok(
        "시간표 조회 성공",
        await timetableForMember(workspaceId, request.user.sub, false),
      );
    },
  );

  return { timetableForMember };
}
