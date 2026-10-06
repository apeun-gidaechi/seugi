import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import bcrypt from "bcryptjs";
import { z } from "zod";
import type { ApiResponse, ChatMessage, Notification, Profile, Role, RoomType, Timetable } from "@seugi/contracts";
import { Store } from "./store.js";

type Claims = { sub: string };
declare module "@fastify/jwt" { interface FastifyJWT { user: Claims } }
const ok = <T>(message: string, data?: T): ApiResponse<T> => data === undefined ? { message } : { message, data };
const body = <T extends z.ZodTypeAny>(schema: T, request: FastifyRequest) => schema.parse(request.body);
const query = <T extends z.ZodTypeAny>(schema: T, request: FastifyRequest) => schema.parse(request.query);
const auth = async (request: FastifyRequest) => request.jwtVerify<Claims>();
const idParam = z.object({ id: z.string().uuid() });
const workspaceParam = z.object({ workspaceId: z.string().uuid() });

export async function buildApp(store = new Store()): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });
  const uploadDirectory = process.env.UPLOAD_DIR ?? "./data/uploads";
  await app.register(cors, { origin: true });
  await app.register(jwt, { secret: process.env.JWT_SECRET ?? "development-only-change-me" });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  app.addHook("onResponse", async () => { store.persist(); });
  app.setErrorHandler((error, _request, reply) => { const message = error instanceof Error ? error.message : "INTERNAL_ERROR"; return reply.code(error instanceof z.ZodError ? 400 : message.endsWith("NOT_FOUND") ? 404 : 500).send({ message }); });
  app.get("/health", async () => ok("healthy", { status: "ok" }));
  app.get("/uploads/:name", async (request, reply) => { const name = basename(z.object({ name: z.string() }).parse(request.params).name); const file = join(uploadDirectory, name); if (!existsSync(file)) return reply.code(404).send({ message: "FILE_NOT_FOUND" }); return reply.send(readFileSync(file)); });

  const credentials = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(1).max(40).optional() });
  app.post("/member/register", async (request, reply) => {
    const input = body(credentials, request);
    if ([...store.members.values()].some((member) => member.email === input.email)) return reply.code(409).send({ message: "이미 가입된 이메일입니다" });
    const member: { id: string; email: string; name: string; password: string; refreshToken?: string } = { id: store.id(), email: input.email, name: input.name ?? input.email.split("@")[0], password: await bcrypt.hash(input.password, 12) };
    store.members.set(member.id, member);
    const tokens = { accessToken: app.jwt.sign({ sub: member.id }), refreshToken: app.jwt.sign({ sub: member.id }, { expiresIn: "30d" }) };
    member.refreshToken = tokens.refreshToken;
    return ok("회원가입 성공", tokens);
  });
  app.post("/member/login", async (request, reply) => {
    const input = body(credentials.pick({ email: true, password: true }), request);
    const candidate = [...store.members.values()].find((item) => item.email === input.email);
    const member = candidate?.password && await bcrypt.compare(input.password, candidate.password) ? candidate : undefined;
    if (!member) return reply.code(401).send({ message: "이메일 또는 비밀번호가 올바르지 않습니다" });
    const tokens = { accessToken: app.jwt.sign({ sub: member.id }), refreshToken: app.jwt.sign({ sub: member.id }, { expiresIn: "30d" }) };
    member.refreshToken = tokens.refreshToken;
    return ok("로그인 성공", tokens);
  });
  app.get("/member/refresh", async (request, reply) => {
    const token = query(z.object({ token: z.string() }), request).token;
    try { const claims = app.jwt.verify<Claims>(token); const member = store.requireMember(claims.sub); if (member.refreshToken !== token) throw new Error(); return ok("토큰 재발급 성공", app.jwt.sign({ sub: member.id })); }
    catch { return reply.code(401).send({ message: "유효하지 않은 리프레시 토큰입니다" }); }
  });
  app.get("/member/myInfo", { preHandler: auth }, async (request) => { const { password: _password, refreshToken: _refreshToken, ...member } = store.requireMember(request.user.sub); return ok("내 정보 조회 성공", member); });
  app.patch("/member/edit", { preHandler: auth }, async (request) => { const input = body(z.object({ name: z.string().min(1).max(40).optional(), picture: z.string().url().optional() }), request); Object.assign(store.requireMember(request.user.sub), input); return ok("회원 정보 수정 성공"); });
  app.post("/member/logout", { preHandler: auth }, async (request) => { store.requireMember(request.user.sub).refreshToken = undefined; return ok("로그아웃 성공"); });
  app.delete("/member/remove", { preHandler: auth }, async (request) => { store.members.delete(request.user.sub); return ok("회원 탈퇴 성공"); });

  const workspaceInput = z.object({ name: z.string().min(1).max(80), schoolCode: z.string().optional(), image: z.string().url().optional() });
  app.post("/workspace", { preHandler: auth }, async (request) => { const input = body(workspaceInput, request); const workspace = { id: store.id(), code: store.id().slice(0, 8).toUpperCase(), ownerId: request.user.sub, members: [request.user.sub], waitlist: [], ...input }; store.workspaces.set(workspace.id, workspace); return ok("워크스페이스 생성 성공", workspace.id); });
  app.get("/workspace", { preHandler: auth }, async (request) => ok("워크스페이스 조회 성공", [...store.workspaces.values()].filter((item) => item.members.includes(request.user.sub))));
  app.get("/workspace/:workspaceId", { preHandler: auth }, async (request) => { const id = workspaceParam.parse(request.params).workspaceId; const workspace = store.requireWorkspace(id); if (!workspace.members.includes(request.user.sub)) throw new Error("WORKSPACE_NOT_FOUND"); return ok("워크스페이스 조회 성공", workspace); });
  app.delete("/workspace/:workspaceId", { preHandler: auth }, async (request) => { const workspace = store.requireWorkspace(workspaceParam.parse(request.params).workspaceId); if (workspace.ownerId !== request.user.sub) throw new Error("권한이 없습니다"); store.workspaces.delete(workspace.id); return ok("워크스페이스 삭제 성공"); });
  app.get("/workspace/code/:workspaceId", { preHandler: auth }, async (request) => { const workspace = store.requireWorkspace(workspaceParam.parse(request.params).workspaceId); if (!workspace.members.includes(request.user.sub)) throw new Error("권한이 없습니다"); return ok("초대 코드 조회 성공", workspace.code); });
  app.get("/workspace/search/:code", async (request) => { const workspace = [...store.workspaces.values()].find((item) => item.code === z.object({ code: z.string() }).parse(request.params).code); if (!workspace) throw new Error("WORKSPACE_NOT_FOUND"); return ok("워크스페이스 검색 성공", workspace); });
  app.post("/workspace/join", { preHandler: auth }, async (request) => { const input = body(z.object({ code: z.string() }), request); const workspace = [...store.workspaces.values()].find((item) => item.code === input.code); if (!workspace) throw new Error("WORKSPACE_NOT_FOUND"); if (!workspace.members.includes(request.user.sub) && !workspace.waitlist.includes(request.user.sub)) workspace.waitlist.push(request.user.sub); return ok("가입 신청 성공"); });
  app.patch("/workspace/add", { preHandler: auth }, async (request) => { const input = body(z.object({ workspaceId: z.string().uuid(), memberId: z.string().uuid() }), request); const workspace = store.requireWorkspace(input.workspaceId); if (workspace.ownerId !== request.user.sub) throw new Error("권한이 없습니다"); workspace.waitlist = workspace.waitlist.filter((id) => id !== input.memberId); if (!workspace.members.includes(input.memberId)) workspace.members.push(input.memberId); return ok("가입 승인 성공"); });
  const memberWorkspaceInput = z.object({ workspaceId: z.string().uuid(), memberId: z.string().uuid() });
  app.delete("/workspace/cancel", { preHandler: auth }, async (request) => { const input = body(memberWorkspaceInput, request); const workspace = store.requireWorkspace(input.workspaceId); workspace.waitlist = workspace.waitlist.filter((id) => id !== request.user.sub); return ok("가입 신청 취소 성공"); });
  app.get("/workspace/wait-list", { preHandler: auth }, async (request) => { const workspaceId = query(z.object({ workspaceId: z.string().uuid(), role: z.string().optional() }), request).workspaceId; const workspace = store.requireWorkspace(workspaceId); if (workspace.ownerId !== request.user.sub) throw new Error("권한이 없습니다"); return ok("가입 대기 목록 조회 성공", workspace.waitlist.map((id) => store.requireMember(id))); });
  app.patch("/workspace", { preHandler: auth }, async (request) => { const input = body(workspaceInput.extend({ workspaceId: z.string().uuid() }), request); const workspace = store.requireWorkspace(input.workspaceId); if (workspace.ownerId !== request.user.sub) throw new Error("권한이 없습니다"); Object.assign(workspace, input); return ok("워크스페이스 수정 성공"); });
  app.get("/workspace/my/wait-list", { preHandler: auth }, async (request) => ok("내 가입 대기 목록 조회 성공", [...store.workspaces.values()].filter((workspace) => workspace.waitlist.includes(request.user.sub))));
  app.get("/workspace/members/chart", { preHandler: auth }, async (request) => { const workspace = store.requireWorkspace(query(z.object({ workspaceId: z.string().uuid() }), request).workspaceId); if (!workspace.members.includes(request.user.sub)) throw new Error("권한이 없습니다"); return ok("구성원 통계 조회 성공", { total: workspace.members.length, students: workspace.members.filter((id) => store.profiles.get(`${workspace.id}:${id}`)?.role === "STUDENT").length, teachers: workspace.members.filter((id) => store.profiles.get(`${workspace.id}:${id}`)?.role === "TEACHER").length }); });
  app.get("/workspace/members", { preHandler: auth }, async (request) => { const workspace = store.requireWorkspace(query(z.object({ workspaceId: z.string().uuid() }), request).workspaceId); if (!workspace.members.includes(request.user.sub)) throw new Error("권한이 없습니다"); return ok("구성원 목록 조회 성공", workspace.members.map((id) => store.profiles.get(`${workspace.id}:${id}`) ?? store.requireMember(id))); });
  app.patch("/workspace/permission", { preHandler: auth }, async (request) => { const input = body(memberWorkspaceInput.extend({ role: z.enum(["STUDENT", "TEACHER", "MIDDLE_ADMIN", "ADMIN"]) }), request); const workspace = store.requireWorkspace(input.workspaceId); if (workspace.ownerId !== request.user.sub) throw new Error("권한이 없습니다"); const member = store.requireMember(input.memberId); const previous = store.profiles.get(`${workspace.id}:${member.id}`); store.profiles.set(`${workspace.id}:${member.id}`, { ...member, workspaceId: workspace.id, role: input.role, ...previous }); return ok("권한 변경 성공"); });
  app.patch("/workspace/kick", { preHandler: auth }, async (request) => { const input = body(memberWorkspaceInput, request); const workspace = store.requireWorkspace(input.workspaceId); if (workspace.ownerId !== request.user.sub || input.memberId === workspace.ownerId) throw new Error("권한이 없습니다"); workspace.members = workspace.members.filter((id) => id !== input.memberId); return ok("구성원 내보내기 성공"); });

  const profileInput = z.object({ role: z.enum(["STUDENT", "TEACHER", "MIDDLE_ADMIN", "ADMIN"]), grade: z.number().int().positive().optional(), class: z.number().int().positive().optional(), number: z.number().int().positive().optional(), phone: z.string().optional(), status: z.string().optional() });
  app.patch("/profile/:workspaceId", { preHandler: auth }, async (request) => { const workspaceId = workspaceParam.parse(request.params).workspaceId; if (!store.canAccess(workspaceId, request.user.sub)) throw new Error("권한이 없습니다"); const member = store.requireMember(request.user.sub); const profile: Profile = { ...member, workspaceId, ...profileInput.parse(request.body) }; store.profiles.set(`${workspaceId}:${member.id}`, profile); return ok("프로필 수정 성공"); });
  app.patch("/profile/schidnum/:workspaceId", { preHandler: auth }, async (request) => { const workspaceId = workspaceParam.parse(request.params).workspaceId; const input = body(z.object({ grade: z.number().int().positive(), class: z.number().int().positive(), number: z.number().int().positive() }), request); const member = store.requireMember(request.user.sub); const existing = store.profiles.get(`${workspaceId}:${member.id}`) ?? { ...member, workspaceId, role: "STUDENT" as const }; store.profiles.set(`${workspaceId}:${member.id}`, { ...existing, ...input }); return ok("학번 수정 성공"); });
  app.get("/profile/me", { preHandler: auth }, async (request) => { const workspaceId = query(z.object({ workspaceId: z.string().uuid() }), request).workspaceId; return ok("프로필 조회 성공", store.profiles.get(`${workspaceId}:${request.user.sub}`) ?? { ...store.requireMember(request.user.sub), workspaceId, role: "STUDENT" satisfies Role }); });
  app.get("/profile/others", async (request) => { const input = query(z.object({ workspaceId: z.string().uuid(), memberId: z.string().uuid() }), request); return ok("프로필 조회 성공", store.profiles.get(`${input.workspaceId}:${input.memberId}`)); });

  const roomInput = z.object({ workspaceId: z.string().uuid(), name: z.string().min(1).max(80), memberIds: z.array(z.string().uuid()).default([]), image: z.string().url().optional() });
  const createRoom = (type: RoomType) => async (request: FastifyRequest) => { const input = body(roomInput, request); if (!store.canAccess(input.workspaceId, request.user.sub)) throw new Error("권한이 없습니다"); const room = { id: store.id(), type, ...input, memberIds: [...new Set([request.user.sub, ...input.memberIds])], adminId: request.user.sub }; store.rooms.set(room.id, room); return ok("채팅방 생성 성공", room.id); };
  for (const [path, type] of [["/chat/group/create", "GROUP"], ["/chat/personal/create", "PERSONAL"]] as const) app.post(path, { preHandler: auth }, createRoom(type));
  for (const [prefix, type] of [["/chat/group", "GROUP"], ["/chat/personal", "PERSONAL"]] as const) {
    app.get(`${prefix}/search/:workspaceId`, { preHandler: auth }, async (request) => { const workspaceId = workspaceParam.parse(request.params).workspaceId; const rooms = [...store.rooms.values()].filter((room) => room.workspaceId === workspaceId && room.type === type && room.memberIds.includes(request.user.sub)); return ok("채팅방 목록 조회 성공", rooms); });
    app.get(`${prefix}/search/room/:roomId`, { preHandler: auth }, async (request) => { const roomId = z.object({ roomId: z.string().uuid() }).parse(request.params).roomId; const room = store.rooms.get(roomId); if (!room || room.type !== type || !room.memberIds.includes(request.user.sub)) throw new Error("ROOM_NOT_FOUND"); return ok("채팅방 조회 성공", room); });
    app.get(`${prefix}/search`, { preHandler: auth }, async (request) => { const input = query(z.object({ workspace: z.string().uuid(), word: z.string().default("") }), request); return ok("채팅방 검색 성공", [...store.rooms.values()].filter((room) => room.workspaceId === input.workspace && room.type === type && room.memberIds.includes(request.user.sub) && room.name.includes(input.word))); });
  }
  app.patch("/chat/group/left/:roomId", { preHandler: auth }, async (request) => { const room = store.rooms.get(z.object({ roomId: z.string().uuid() }).parse(request.params).roomId); if (!room) throw new Error("ROOM_NOT_FOUND"); room.memberIds = room.memberIds.filter((id) => id !== request.user.sub); return ok("채팅방 나가기 성공"); });
  const memberEvent = z.object({ roomId: z.string().uuid(), memberIds: z.array(z.string().uuid()), memberId: z.string().uuid().optional() });
  app.post("/chat/group/member/add", { preHandler: auth }, async (request) => { const input = body(memberEvent, request); const room = store.rooms.get(input.roomId); if (!room || room.adminId !== request.user.sub) throw new Error("권한이 없습니다"); room.memberIds = [...new Set([...room.memberIds, ...input.memberIds])]; return ok("참여자 추가 성공"); });
  app.patch("/chat/group/member/kick", { preHandler: auth }, async (request) => { const input = body(memberEvent, request); const room = store.rooms.get(input.roomId); if (!room || room.adminId !== request.user.sub) throw new Error("권한이 없습니다"); room.memberIds = room.memberIds.filter((id) => !input.memberIds.includes(id)); return ok("참여자 추방 성공"); });
  app.patch("/chat/group/member/toss", { preHandler: auth }, async (request) => { const input = body(memberEvent, request); const room = store.rooms.get(input.roomId); const nextAdmin = input.memberId ?? input.memberIds[0]; if (!room || room.adminId !== request.user.sub || !nextAdmin || !room.memberIds.includes(nextAdmin)) throw new Error("권한이 없습니다"); room.adminId = nextAdmin; return ok("방장 위임 성공"); });
  app.get("/message/search/:roomId", { preHandler: auth }, async (request) => { const roomId = z.object({ roomId: z.string().uuid() }).parse(request.params).roomId; const room = store.rooms.get(roomId); if (!room?.memberIds.includes(request.user.sub)) throw new Error("ROOM_NOT_FOUND"); const timestamp = query(z.object({ timestamp: z.string().optional() }), request).timestamp; const messages = [...store.messages.values()].filter((item) => item.roomId === roomId && (!timestamp || item.createdAt < timestamp)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50); return ok("메시지 조회 성공", { messages, hasNext: messages.length === 50 }); });
  const emojiInput = z.object({ messageId: z.string().uuid(), emoji: z.string().min(1).max(16) });
  app.put("/message/emoji", { preHandler: auth }, async (request) => { const input = body(emojiInput, request); const message = store.messages.get(input.messageId); if (!message) throw new Error("MESSAGE_NOT_FOUND"); (message.emojis[input.emoji] ??= []).push(request.user.sub); message.emojis[input.emoji] = [...new Set(message.emojis[input.emoji])]; return ok("이모지 추가 성공"); });
  app.delete("/message/emoji", { preHandler: auth }, async (request) => { const input = body(emojiInput, request); const message = store.messages.get(input.messageId); if (!message) throw new Error("MESSAGE_NOT_FOUND"); message.emojis[input.emoji] = (message.emojis[input.emoji] ?? []).filter((id) => id !== request.user.sub); return ok("이모지 삭제 성공"); });
  app.delete("/message/delete", { preHandler: auth }, async (request) => { const messageId = body(z.object({ messageId: z.string().uuid() }), request).messageId; const message = store.messages.get(messageId); if (!message || message.senderId !== request.user.sub) throw new Error("MESSAGE_NOT_FOUND"); store.messages.delete(messageId); return ok("메시지 삭제 성공"); });

  const notificationInput = z.object({ workspaceId: z.string().uuid(), title: z.string().min(1).max(100), content: z.string().min(1) });
  app.post("/notification", { preHandler: auth }, async (request) => { const input = body(notificationInput, request); const workspace = store.requireWorkspace(input.workspaceId); if (workspace.ownerId !== request.user.sub) throw new Error("권한이 없습니다"); const notification: Notification = { id: store.id(), ...input, authorId: request.user.sub, createdAt: new Date().toISOString(), emojis: {} }; store.notifications.set(notification.id, notification); return ok("공지 생성 성공", notification); });
  app.get("/notification/:workspaceId", { preHandler: auth }, async (request) => { const workspaceId = workspaceParam.parse(request.params).workspaceId; if (!store.canAccess(workspaceId, request.user.sub)) throw new Error("권한이 없습니다"); return ok("공지 조회 성공", [...store.notifications.values()].filter((item) => item.workspaceId === workspaceId)); });
  app.patch("/notification", { preHandler: auth }, async (request) => { const input = body(notificationInput.extend({ id: z.string().uuid() }), request); const item = store.notifications.get(input.id); if (!item || item.authorId !== request.user.sub) throw new Error("NOTIFICATION_NOT_FOUND"); Object.assign(item, input); return ok("공지 수정 성공"); });
  app.delete("/notification/:workspaceId/:id", { preHandler: auth }, async (request) => { const { id } = idParam.parse(request.params); const item = store.notifications.get(id); if (!item || item.authorId !== request.user.sub) throw new Error("NOTIFICATION_NOT_FOUND"); store.notifications.delete(id); return ok("공지 삭제 성공"); });
  app.patch("/notification/emoji", { preHandler: auth }, async (request) => { const input = body(z.object({ notificationId: z.string().uuid(), emoji: z.string() }), request); const item = store.notifications.get(input.notificationId); if (!item) throw new Error("NOTIFICATION_NOT_FOUND"); const people = item.emojis[input.emoji] ?? []; item.emojis[input.emoji] = people.includes(request.user.sub) ? people.filter((id) => id !== request.user.sub) : [...people, request.user.sub]; return ok("성공"); });

  const timetableInput = z.object({ workspaceId: z.string().uuid(), day: z.number().int().min(1).max(7), period: z.number().int().min(1).max(20), subject: z.string().min(1).max(80), teacher: z.string().optional(), location: z.string().optional() });
  app.post("/timetable", { preHandler: auth }, async (request) => { const input = body(timetableInput, request); if (!store.canAccess(input.workspaceId, request.user.sub)) throw new Error("권한이 없습니다"); const entry: Timetable = { id: store.id(), memberId: request.user.sub, ...input }; store.timetables.set(entry.id, entry); return ok("시간표 생성 성공"); });
  app.patch("/timetable", { preHandler: auth }, async (request) => { const input = body(timetableInput.extend({ id: z.string().uuid() }), request); const entry = store.timetables.get(input.id); if (!entry || entry.memberId !== request.user.sub) throw new Error("TIMETABLE_NOT_FOUND"); Object.assign(entry, input); return ok("시간표 수정 성공"); });
  app.delete("/timetable/:id", { preHandler: auth }, async (request) => { const entry = store.timetables.get(idParam.parse(request.params).id); if (!entry || entry.memberId !== request.user.sub) throw new Error("TIMETABLE_NOT_FOUND"); store.timetables.delete(entry.id); return ok("시간표 삭제 성공"); });
  app.post("/timetable/reset", { preHandler: auth }, async (request) => { const workspaceId = query(z.object({ workspaceId: z.string().uuid() }), request).workspaceId; for (const entry of store.timetables.values()) if (entry.workspaceId === workspaceId && entry.memberId === request.user.sub) store.timetables.delete(entry.id); return ok("시간표 재설정 완료"); });
  for (const path of ["/timetable/weekend", "/timetable/day"]) app.get(path, { preHandler: auth }, async (request) => { const workspaceId = query(z.object({ workspaceId: z.string().uuid() }), request).workspaceId; return ok("시간표 조회 성공", [...store.timetables.values()].filter((entry) => entry.workspaceId === workspaceId && entry.memberId === request.user.sub)); });

  const taskInput = z.object({ workspaceId: z.string().uuid(), title: z.string().min(1).max(120), content: z.string().optional(), dueDate: z.string().datetime().optional() });
  app.post("/task", async (request) => { const input = body(taskInput, request); store.requireWorkspace(input.workspaceId); const id = store.id(); store.tasks.set(id, { id, ...input, createdAt: new Date().toISOString() }); return ok("과제 만들기 성공 !"); });
  app.get("/task/:workspaceId", async (request) => { const workspaceId = workspaceParam.parse(request.params).workspaceId; return ok("과제 불러오기 성공 !", [...store.tasks.values()].filter((item) => item.workspaceId === workspaceId)); });
  app.get("/task/classroom", { preHandler: auth }, async () => ok("클래스룸 과제 불러오기 성공 !", []));
  app.get("/meal", async (request) => { const { workspaceId, date } = query(z.object({ workspaceId: z.string().uuid(), date: z.string() }), request); store.requireWorkspace(workspaceId); return ok("날짜로 급식 조회 성공", []); });
  app.get("/meal/all", async (request) => { const workspaceId = query(z.object({ workspaceId: z.string().uuid() }), request).workspaceId; store.requireWorkspace(workspaceId); return ok("모든 급식 조회 성공", []); });
  app.post("/meal/reset/:workspaceId", async (request) => { store.requireWorkspace(workspaceParam.parse(request.params).workspaceId); return ok("급식 저장 성공"); });
  app.get("/schedule/:workspaceId", { preHandler: auth }, async (request) => { const workspaceId = workspaceParam.parse(request.params).workspaceId; if (!store.canAccess(workspaceId, request.user.sub)) throw new Error("권한이 없습니다"); return ok("학사일정 전부 불러오기 성공", store.schedules.filter((item) => item.workspaceId === workspaceId)); });
  app.get("/schedule/month", { preHandler: auth }, async (request) => { const input = query(z.object({ workspaceId: z.string().uuid(), month: z.coerce.number().int().min(1).max(12) }), request); return ok("학사일정 한달치 불러오기 성공", store.schedules.filter((item) => item.workspaceId === input.workspaceId && new Date(item.date).getMonth() + 1 === input.month)); });
  app.get("/email/send", async (request) => { query(z.object({ email: z.string().email() }), request); return ok("이메일 인증 코드 발송 성공"); });
  app.post("/oauth/:provider/authenticate", async (request, reply) => { const provider = z.object({ provider: z.enum(["google", "apple"]) }).parse(request.params).provider; const input = body(z.object({ email: z.string().email().optional(), name: z.string().optional(), code: z.string().min(1) }), request); const email = input.email ?? `${provider}-${input.code}@oauth.seugi.local`; let member = [...store.members.values()].find((item) => item.email === email); if (!member) { member = { id: store.id(), email, name: input.name ?? provider, password: undefined }; store.members.set(member.id, member); } const tokens = { accessToken: app.jwt.sign({ sub: member.id }), refreshToken: app.jwt.sign({ sub: member.id }, { expiresIn: "30d" }) }; member.refreshToken = tokens.refreshToken; return reply.send(ok("소셜 로그인 성공", tokens)); });
  app.post("/oauth/google/connect", { preHandler: auth }, async () => ok("구글 연동 성공"));
  app.delete("/oauth/google/remove", { preHandler: auth }, async () => ok("삭제 성공 !"));
  app.post("/ai", { preHandler: auth }, async (request) => { const input = body(z.object({ message: z.string().min(1).max(4000) }), request); return ok("캣스기답변", `캣스기는 아직 외부 AI 제공자 설정이 필요합니다. 질문: ${input.message}`); });
  app.post("/file/upload/:type", async (request) => { const file = await request.file(); if (!file) throw new Error("FILE_REQUIRED"); const type = z.object({ type: z.enum(["IMAGE", "FILE", "PROFILE"]) }).parse(request.params).type; const bytes = await file.toBuffer(); const name = `${store.id()}-${basename(file.filename).replace(/[^a-zA-Z0-9._-]/g, "_")}`; mkdirSync(uploadDirectory, { recursive: true }); writeFileSync(join(uploadDirectory, name), bytes); return ok("파일 업로드 성공", { name, type, mimeType: file.mimetype, size: bytes.length, url: `/uploads/${encodeURIComponent(name)}` }); });
  return app;
}
