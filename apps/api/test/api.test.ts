import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { io } from "socket.io-client";
import WebSocket from "ws";
import { authenticateOAuthSchema, type ChatMessage } from "@seugi/contracts";
import { SeugiApi, SeugiApiError } from "../../../packages/api-client/src/index.js";
import { createAuthenticatedSocket } from "../../mobile/src/realtime.js";
import { buildApp } from "../src/app.js";
import { attachRealtime } from "../src/realtime.js";
import { Store } from "../src/store.js";

test("production API refuses to start without a JWT secret", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJwtSecret = process.env.JWT_SECRET;
  process.env.NODE_ENV = "production";
  delete process.env.JWT_SECRET;
  try {
    await assert.rejects(buildApp(), /JWT_SECRET_REQUIRED/);
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  }
});

test("access tokens expire and a valid refresh token renews API access", async () => {
  const store = new Store(); const app = await buildApp(store);
  store.emailCodes.set("token-expiry@example.com", { code: "123456", expiresAt: Date.now() + 60_000 });
  try {
    const registration = await app.inject({ method: "POST", url: "/member/register", payload: { email: "token-expiry@example.com", password: "password123", code: "123456" } });
    const { accessToken, refreshToken } = registration.json().data as { accessToken: string; refreshToken: string };
    const memberId = app.jwt.decode<{ sub: string; exp?: number }>(accessToken)!.sub;
    assert.ok(app.jwt.decode<{ exp?: number }>(accessToken)?.exp);
    const expiredToken = app.jwt.sign({ sub: memberId, exp: Math.floor(Date.now() / 1000) - 1 });
    assert.equal((await app.inject({ url: "/member/myInfo", headers: { authorization: `Bearer ${expiredToken}` } })).statusCode, 401);

    const refreshed = await app.inject({ url: `/member/refresh?token=${encodeURIComponent(refreshToken)}` });
    assert.equal(refreshed.statusCode, 200);
    const renewedToken = refreshed.json().data as string;
    assert.ok(app.jwt.decode<{ exp?: number }>(renewedToken)?.exp);
    assert.equal((await app.inject({ url: "/member/myInfo", headers: { authorization: `Bearer ${renewedToken}` } })).statusCode, 200);
  } finally {
    await app.close();
  }
});

test("file-backed API serializes concurrent registrations for the same email", async () => {
  const directory = mkdtempSync(join(tmpdir(), "seugi-register-"));
  const store = new Store(join(directory, "state.json")); const app = await buildApp(store);
  store.emailCodes.set("concurrent-register@example.com", { code: "123456", expiresAt: Date.now() + 60_000 });
  const register = () => app.inject({ method: "POST", url: "/member/register", payload: { email: "concurrent-register@example.com", password: "password123", code: "123456" } });
  try {
    const responses = await Promise.all([register(), register()]);
    assert.deepEqual(responses.map((response) => response.statusCode).sort(), [200, 409]);
    assert.equal([...store.members.values()].filter((member) => member.email === "concurrent-register@example.com").length, 1);
  } finally {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("shared API client refreshes an expired access token once and retries the request", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; authorization: string | null }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const authorization = new Headers(init?.headers).get("authorization");
    calls.push({ url, authorization });
    if (url.includes("/member/refresh?")) return new Response(JSON.stringify({ message: "갱신", data: "fresh-access" }), { status: 200, headers: { "content-type": "application/json" } });
    if (authorization === "Bearer expired-access") return new Response(JSON.stringify({ message: "만료" }), { status: 401, headers: { "content-type": "application/json" } });
    return new Response(JSON.stringify({ message: "내 정보", data: { id: "member-id", email: "token@example.com", name: "토큰" } }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const api = new SeugiApi("https://api.example.com", "expired-access", "valid-refresh");
    const result = await api.memberInfo();
    assert.equal(result.data?.id, "member-id");
    assert.equal(api.accessToken(), "fresh-access");
    assert.deepEqual(calls.map((call) => call.url.split("api.example.com")[1]), ["/member/myInfo", "/member/refresh?token=valid-refresh", "/member/myInfo"]);
    assert.deepEqual(calls.map((call) => call.authorization), ["Bearer expired-access", "Bearer expired-access", "Bearer fresh-access"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("shared API client coalesces concurrent token refreshes", async () => {
  const originalFetch = globalThis.fetch;
  let refreshCalls = 0;
  const retriedPaths: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const authorization = new Headers(init?.headers).get("authorization");
    if (url.includes("/member/refresh?")) {
      refreshCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return new Response(JSON.stringify({ message: "갱신", data: "fresh-access" }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (authorization === "Bearer expired-access") return new Response(JSON.stringify({ message: "만료" }), { status: 401, headers: { "content-type": "application/json" } });
    retriedPaths.push(new URL(url).pathname);
    return new Response(JSON.stringify({ message: "ok", data: [] }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const api = new SeugiApi("https://api.example.com", "expired-access", "valid-refresh");
    await Promise.all([api.workspaces(), api.memberInfo()]);
    assert.equal(refreshCalls, 1);
    assert.deepEqual(retriedPaths.sort(), ["/member/myInfo", "/workspace"].sort());
    assert.equal(api.accessToken(), "fresh-access");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("shared API client builds query and parameter URLs consistently from its contract", async () => {
  const originalFetch = globalThis.fetch;
  const paths: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    paths.push(String(input).replace("https://api.example.com", ""));
    return new Response(JSON.stringify({ message: "ok", data: [] }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const api = new SeugiApi("https://api.example.com", "token");
    await Promise.all([
      api.searchRooms("workspace id", "hello world"),
      api.profileOfOther("workspace-id", "member-id"),
      api.messages("room-id", "2026-10-07T12:00:00Z"),
      api.weeklyTimetable("workspace-id", "2", "4"),
      api.meals("workspace-id", 2026, 10),
      api.meals("workspace id", 2026),
      api.schedulesForMonth("workspace-id", 10),
      api.workspaceDetails("school/id"),
      api.notifications("workspace id", 1, 5),
    ]);
    assert.deepEqual(paths.sort(), [
      "/chat/group/search?workspace=workspace%20id&word=hello%20world",
      "/message/search/room-id?timestamp=2026-10-07T12%3A00%3A00Z",
      "/notification/workspace%20id?page=1&size=5",
      "/meal/all?workspaceId=workspace-id&year=2026&month=10",
      "/meal/all?workspaceId=workspace%20id",
      "/profile/others?workspaceId=workspace-id&memberId=member-id",
      "/schedule/month?workspaceId=workspace-id&month=10",
      "/timetable/weekend?workspaceId=workspace-id&grade=2&classNum=4",
      "/workspace/school%2Fid",
    ].sort());
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("shared API client preserves HTTP status codes in typed errors", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ message: "권한이 없습니다" }), { status: 403, headers: { "content-type": "application/json" } })) as typeof fetch;
  try {
    await assert.rejects(new SeugiApi("https://api.example.com").workspaces(), (error: unknown) => {
      assert.ok(error instanceof SeugiApiError);
      assert.equal(error.status, 403);
      assert.equal(error.message, "권한이 없습니다");
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("member can register, create a workspace, and retrieve it", async () => {
  const store = new Store(); store.emailCodes.set("student@example.com", { code: "123456", expiresAt: Date.now() + 60_000 }); const app = await buildApp(store);
  const registration = await app.inject({ method: "POST", url: "/member/register", payload: { email: "student@example.com", password: "password123", name: "학생", code: "123456" } });
  assert.equal(registration.statusCode, 200);
  const authorization = `Bearer ${registration.json().data.accessToken}`;
  const workspace = await app.inject({ method: "POST", url: "/workspace", headers: { authorization }, payload: { name: "스기고" } });
  assert.equal(workspace.statusCode, 200);
  const workspaceCode = await app.inject({ method: "GET", url: `/workspace/code/${workspace.json().data}`, headers: { authorization } });
  assert.match(workspaceCode.json().data, /^[A-Z0-9]{6}$/);
  const task = await app.inject({ method: "POST", url: "/task", headers: { authorization }, payload: { workspaceId: workspace.json().data, title: "수학 과제", content: "2단원 문제 풀기", dueDate: "2026-10-15T00:00:00.000Z" } });
  assert.equal(task.statusCode, 200);
  const tasks = await app.inject({ method: "GET", url: `/task/${workspace.json().data}`, headers: { authorization } });
  assert.equal(tasks.json().data[0].title, "수학 과제");
  assert.equal(tasks.json().data[0].content, "2단원 문제 풀기");
  assert.equal(tasks.json().data[0].description, "2단원 문제 풀기");
  assert.equal(tasks.json().data[0].dueDate, "2026-10-15T00:00:00.000Z");
  const legacyTask = await app.inject({ method: "POST", url: "/task", headers: { authorization }, payload: { workspaceId: workspace.json().data, title: "영어 과제", description: "단어 암기" } });
  assert.equal(legacyTask.statusCode, 200);
  const tasksWithLegacyDescription = await app.inject({ method: "GET", url: `/task/${workspace.json().data}`, headers: { authorization } });
  assert.deepEqual(tasksWithLegacyDescription.json().data[1], { id: tasksWithLegacyDescription.json().data[1].id, workspaceId: workspace.json().data, title: "영어 과제", description: "단어 암기", content: "단어 암기", createdAt: tasksWithLegacyDescription.json().data[1].createdAt });
  const list = await app.inject({ method: "GET", url: "/workspace", headers: { authorization } });
  assert.equal(list.json().data.length, 1);
  await app.close();
});

test("Catseugi school-data answers use the selected workspace and enforce membership", async () => {
  const store = new Store();
  store.emailCodes.set("catseugi-owner@example.com", { code: "123456", expiresAt: Date.now() + 60_000 });
  store.emailCodes.set("catseugi-student@example.com", { code: "222222", expiresAt: Date.now() + 60_000 });
  store.emailCodes.set("catseugi-outsider@example.com", { code: "654321", expiresAt: Date.now() + 60_000 });
  const app = await buildApp(store);
  try {
    const owner = await app.inject({ method: "POST", url: "/member/register", payload: { email: "catseugi-owner@example.com", password: "password123", name: "학생", code: "123456" } });
    const ownerHeaders = { authorization: `Bearer ${owner.json().data.accessToken}` };
    const created = await app.inject({ method: "POST", url: "/workspace", headers: ownerHeaders, payload: { name: "급식 학교" } });
    const workspaceId = created.json().data as string;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    store.meals.set(workspaceId, [{ date: today, type: "중식", menu: ["김치볶음밥"] }]);
    const answer = await app.inject({ method: "POST", url: "/ai", headers: ownerHeaders, payload: { workspaceId, message: "오늘 급식 뭐야?" } });
    assert.equal(answer.statusCode, 200);
    assert.match(answer.json().data, /김치볶음밥/);

    const student = await app.inject({ method: "POST", url: "/member/register", payload: { email: "catseugi-student@example.com", password: "password123", name: "민지", code: "222222" } });
    const studentId = app.jwt.decode<{ sub: string }>(student.json().data.accessToken)!.sub;
    store.requireWorkspace(workspaceId).members.push(studentId);
    store.profiles.set(`${workspaceId}:${studentId}`, { ...store.requireMember(studentId), workspaceId, role: "STUDENT", grade: 2, class: 4 });
    const picked = await app.inject({ method: "POST", url: "/ai", headers: ownerHeaders, payload: { workspaceId, message: "2학년 4반에서 아무나 한 명 뽑아줘" } });
    assert.equal(picked.statusCode, 200);
    assert.equal(picked.json().data, "민지님이 뽑혔어요!");

    const outsider = await app.inject({ method: "POST", url: "/member/register", payload: { email: "catseugi-outsider@example.com", password: "password123", name: "외부인", code: "654321" } });
    const forbidden = await app.inject({ method: "POST", url: "/ai", headers: { authorization: `Bearer ${outsider.json().data.accessToken}` }, payload: { workspaceId, message: "오늘 급식 뭐야?" } });
    assert.equal(forbidden.statusCode, 403);
  } finally {
    await app.close();
  }
});

test("timetable query can target a class only for workspace staff", async () => {
  const store = new Store();
  store.emailCodes.set("timetable-owner@example.com", { code: "123456", expiresAt: Date.now() + 60_000 });
  store.emailCodes.set("timetable-student@example.com", { code: "654321", expiresAt: Date.now() + 60_000 });
  const app = await buildApp(store);
  try {
    const owner = await app.inject({ method: "POST", url: "/member/register", payload: { email: "timetable-owner@example.com", password: "password123", name: "교사", code: "123456" } });
    const ownerToken = owner.json().data.accessToken as string;
    const ownerId = app.jwt.decode<{ sub: string }>(ownerToken)!.sub;
    const headers = { authorization: `Bearer ${ownerToken}` };
    const created = await app.inject({ method: "POST", url: "/workspace", headers, payload: { name: "시간표 학교" } });
    const workspaceId = created.json().data as string;
    const todayDate = new Date();
    const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, "0")}-${String(todayDate.getDate()).padStart(2, "0")}`;
    const wanted = { id: randomUUID(), workspaceId, grade: "2", classNum: "3", time: "1", subject: "과학", date: today };
    store.timetables.set(wanted.id, wanted);
    const other = { ...wanted, id: randomUUID(), grade: "1", classNum: "1", subject: "수학" };
    store.timetables.set(other.id, other);

    const target = await app.inject({ url: `/timetable/weekend?workspaceId=${workspaceId}&grade=2&classNum=3`, headers });
    assert.equal(target.statusCode, 200);
    assert.deepEqual(target.json().data.map((item: { subject: string }) => item.subject), ["과학"]);
    assert.equal((await app.inject({ url: `/timetable/weekend?workspaceId=${workspaceId}&grade=2`, headers })).statusCode, 400);

    const student = await app.inject({ method: "POST", url: "/member/register", payload: { email: "timetable-student@example.com", password: "password123", name: "학생", code: "654321" } });
    const studentId = app.jwt.decode<{ sub: string }>(student.json().data.accessToken)!.sub;
    store.requireWorkspace(workspaceId).members.push(studentId);
    store.profiles.set(`${workspaceId}:${studentId}`, { ...store.requireMember(studentId), workspaceId, role: "STUDENT", grade: 1, class: 1 });
    const denied = await app.inject({ url: `/timetable/weekend?workspaceId=${workspaceId}&grade=2&classNum=3`, headers: { authorization: `Bearer ${student.json().data.accessToken}` } });
    assert.equal(denied.statusCode, 403);
  } finally {
    await app.close();
  }
});

test("deleting a workspace preserves its data but hides it from active endpoints", async () => {
  const store = new Store(); store.emailCodes.set("workspace-delete@example.com", { code: "123456", expiresAt: Date.now() + 60_000 }); const app = await buildApp(store);
  const registration = await app.inject({ method: "POST", url: "/member/register", payload: { email: "workspace-delete@example.com", password: "password123", code: "123456" } });
  const headers = { authorization: `Bearer ${registration.json().data.accessToken}` };
  const created = await app.inject({ method: "POST", url: "/workspace", headers, payload: { name: "보존 학교" } });
  const workspaceId = created.json().data as string;
  const workspace = store.workspaces.get(workspaceId); assert.ok(workspace);
  store.tasks.set("historical-task", { id: "historical-task", workspaceId, title: "보존 과제", createdAt: "2026-10-07T00:00:00.000Z" });
  assert.equal((await app.inject({ method: "DELETE", url: `/workspace/${workspaceId}`, headers })).statusCode, 200);
  assert.equal(store.workspaces.get(workspaceId)?.status, "DELETE");
  assert.equal(store.tasks.get("historical-task")?.workspaceId, workspaceId);
  assert.deepEqual((await app.inject({ url: "/workspace", headers })).json().data, []);
  assert.equal((await app.inject({ url: `/workspace/${workspaceId}`, headers })).statusCode, 404);
  assert.equal((await app.inject({ url: `/workspace/search/${workspace?.code}`, headers })).statusCode, 404);
  assert.equal((await app.inject({ method: "POST", url: "/workspace/join", headers, payload: { code: workspace?.code } })).statusCode, 404);
  await app.close();
});

test("workspace endpoints accept and return the original desktop and Android field names", async () => {
  const store = new Store(); store.emailCodes.set("legacy-workspace@example.com", { code: "123456", expiresAt: Date.now() + 60_000 }); const app = await buildApp(store);
  const registration = await app.inject({ method: "POST", url: "/member/register", payload: { email: "legacy-workspace@example.com", password: "password123", code: "123456" } });
  const headers = { authorization: `Bearer ${registration.json().data.accessToken}` };
  const created = await app.inject({ method: "POST", url: "/workspace/", headers, payload: { workspaceName: "호환 학교", workspaceImageUrl: "https://example.com/school.png" } });
  assert.equal(created.statusCode, 200);
  const workspaceId = created.json().data as string;
  const listed = await app.inject({ url: "/workspace/", headers });
  assert.equal(listed.json().data[0].workspaceId, workspaceId);
  assert.equal(listed.json().data[0].workspaceName, "호환 학교");
  assert.equal(listed.json().data[0].workspaceImageUrl, "https://example.com/school.png");
  const code = store.workspaces.get(workspaceId)?.code;
  const publicSearch = await app.inject({ url: `/workspace/search/${code}` });
  assert.equal(publicSearch.statusCode, 200);
  assert.equal(publicSearch.json().data.workspaceId, workspaceId);
  const searched = await app.inject({ url: `/workspace/search/${code}`, headers });
  assert.deepEqual(Object.keys(searched.json().data).sort(), ["studentCount", "teacherCount", "workspaceId", "workspaceImageUrl", "workspaceName"]);
  assert.equal(searched.json().data.workspaceName, "호환 학교");
  assert.equal(searched.json().data.studentCount, 0);
  assert.equal(searched.json().data.teacherCount, 1);
  assert.equal((await app.inject({ method: "PATCH", url: "/workspace", headers, payload: { workspaceId, workspaceName: "이름 수정", workspaceImgUrl: "" } })).statusCode, 200);
  assert.equal(store.workspaces.get(workspaceId)?.name, "이름 수정");
  await app.close();
});

test("message history uses an exclusive timestamp cursor and reports older pages", async () => {
  const store = new Store();
  const memberId = "a1b11111-1111-4111-8111-111111111111";
  const workspaceId = "a2b22222-2222-4222-8222-222222222222";
  const roomId = "a3b33333-3333-4333-8333-333333333333";
  store.members.set(memberId, { id: memberId, email: "history@example.com", name: "히스토리" });
  store.workspaces.set(workspaceId, { id: workspaceId, code: "HISTORY1", name: "기록고", ownerId: memberId, members: [memberId], waitlist: [] });
  store.rooms.set(roomId, { id: roomId, workspaceId, type: "GROUP", name: "대화방", memberIds: [memberId], adminId: memberId });
  for (let index = 0; index < 55; index += 1) {
    const createdAt = new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString();
    const id = `a4b44444-4444-4444-8444-${String(index).padStart(12, "0")}`;
    store.messages.set(id, { id, roomId, senderId: memberId, message: `메시지 ${index}`, createdAt, emojis: index === 54 ? { "👍": [memberId], "😢": [memberId] } : {} });
  }
  const app = await buildApp(store);
  const headers = { authorization: `Bearer ${app.jwt.sign({ sub: memberId })}` };
  const firstPage = await app.inject({ url: `/message/search/${roomId}`, headers });
  assert.equal(firstPage.statusCode, 200);
  assert.equal(firstPage.json().data.messages.length, 50);
  assert.equal(firstPage.json().data.hasNext, true);
  assert.equal(firstPage.json().data.firstMessageId, firstPage.json().data.messages.at(-1).id);
  const legacyMessage = firstPage.json().data.messages[0];
  assert.equal(legacyMessage.chatRoomId, roomId); assert.equal(legacyMessage.userId, memberId); assert.equal(legacyMessage.uuid, legacyMessage.id);
  assert.equal(legacyMessage.type, "MESSAGE"); assert.equal(legacyMessage.messageStatus, "ALIVE"); assert.equal(legacyMessage.emojiList[0].emojiId, 1);
  const cursor = firstPage.json().data.messages.at(-1).createdAt as string;
  const nextPage = await app.inject({ url: `/message/search/${roomId}?timestamp=${encodeURIComponent(cursor)}`, headers });
  assert.equal(nextPage.statusCode, 200);
  assert.equal(nextPage.json().data.messages.length, 5);
  assert.equal(nextPage.json().data.hasNext, false);
  assert.ok(nextPage.json().data.messages.every((message: { createdAt: string }) => message.createdAt < cursor));
  await app.close();
});

test("message deletion preserves a room-scoped tombstone and publishes a deletion event", async () => {
  const store = new Store();
  const senderId = "a5b55555-5555-4555-8555-555555555555";
  const otherId = "a6b66666-6666-4666-8666-666666666666";
  const workspaceId = "a7b77777-7777-4777-8777-777777777777";
  const roomId = "a8b88888-8888-4888-8888-888888888888";
  const wrongRoomId = "a9b99999-9999-4999-8999-999999999999";
  const messageId = "abbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  store.members.set(senderId, { id: senderId, email: "sender@example.com", name: "발신자" });
  store.members.set(otherId, { id: otherId, email: "other-message@example.com", name: "다른 구성원" });
  store.workspaces.set(workspaceId, { id: workspaceId, code: "DELETE1", name: "메시지 학교", ownerId: senderId, members: [senderId, otherId], waitlist: [] });
  store.rooms.set(roomId, { id: roomId, workspaceId, type: "GROUP", name: "삭제 테스트", memberIds: [senderId, otherId], adminId: senderId });
  store.rooms.set(wrongRoomId, { id: wrongRoomId, workspaceId, type: "GROUP", name: "다른 방", memberIds: [senderId, otherId], adminId: senderId });
  store.messages.set(messageId, { id: messageId, roomId, senderId, message: "이 메시지를 지웁니다", files: ["/uploads/photo.png"], createdAt: new Date().toISOString(), emojis: { "👍": [otherId] } });
  const events: Array<{ roomId: string; messageId: string; senderId: string }> = [];
  store.onMessageDeleted((event) => events.push(event));
  const app = await buildApp(store);
  const senderHeaders = { authorization: `Bearer ${app.jwt.sign({ sub: senderId })}` };
  const otherHeaders = { authorization: `Bearer ${app.jwt.sign({ sub: otherId })}` };
  assert.equal((await app.inject({ method: "DELETE", url: "/message/delete", headers: otherHeaders, payload: { roomId, messageId } })).statusCode, 404);
  assert.equal((await app.inject({ method: "DELETE", url: "/message/delete", headers: senderHeaders, payload: { roomId: wrongRoomId, messageId } })).statusCode, 404);
  assert.equal((await app.inject({ method: "DELETE", url: "/message/delete", headers: senderHeaders, payload: { roomId, messageId } })).statusCode, 200);
  const deleted = store.messages.get(messageId);
  assert.equal(deleted?.message, "");
  assert.equal(deleted?.files, undefined);
  assert.equal(deleted?.messageStatus, "DELETE");
  assert.deepEqual(events, [{ roomId, messageId, senderId }]);
  const history = await app.inject({ url: `/message/search/${roomId}`, headers: otherHeaders });
  assert.equal(history.json().data.messages[0].messageStatus, "DELETE");
  assert.equal(history.json().data.messages[0].message, "");
  await app.close();
});

test("meal API can serve the cached requested month and validates month ranges", async () => {
  const store = new Store(); const app = await buildApp(store);
  const memberId = "2ca59215-e627-43f4-a5c1-4c1feb56cf21"; const outsiderId = "2ca59215-e627-43f4-a5c1-4c1feb56cf23";
  const workspaceId = "2ca59215-e627-43f4-a5c1-4c1feb56cf22";
  store.members.set(memberId, { id: memberId, email: "meal-member@example.com", name: "급식 구성원" }); store.members.set(outsiderId, { id: outsiderId, email: "meal-outsider@example.com", name: "외부 사용자" });
  store.workspaces.set(workspaceId, { id: workspaceId, code: "MEALTEST", name: "급식 학교", ownerId: memberId, members: [memberId], waitlist: [] });
  const memberHeaders = { authorization: `Bearer ${app.jwt.sign({ sub: memberId })}` }; const outsiderHeaders = { authorization: `Bearer ${app.jwt.sign({ sub: outsiderId })}` };
  const now = new Date(); const year = now.getFullYear(); const month = now.getMonth() + 1;
  const cached = [{ date: `${year}-${String(month).padStart(2, "0")}-01`, type: "중식", menu: ["테스트 메뉴"], calorie: "500 Kcal" }];
  store.meals.set(workspaceId, cached);
  assert.equal((await app.inject({ method: "GET", url: `/meal/all?workspaceId=${workspaceId}` })).statusCode, 401);
  assert.equal((await app.inject({ method: "POST", url: `/meal/reset/${workspaceId}` })).statusCode, 401);
  assert.equal((await app.inject({ method: "GET", url: `/meal/all?workspaceId=${workspaceId}`, headers: outsiderHeaders })).statusCode, 403);
  assert.equal((await app.inject({ method: "POST", url: `/meal/reset/${workspaceId}`, headers: outsiderHeaders })).statusCode, 403);
  const meals = await app.inject({ method: "GET", url: `/meal/all?workspaceId=${workspaceId}&year=${year}&month=${month}`, headers: memberHeaders });
  assert.equal(meals.statusCode, 200); assert.deepEqual(meals.json().data, cached);
  const dailyMeals = await app.inject({ method: "GET", url: `/meal?workspaceId=${workspaceId}&date=${cached[0].date}`, headers: memberHeaders });
  assert.deepEqual(dailyMeals.json().data, cached);
  const invalidRange = await app.inject({ method: "GET", url: `/meal/all?workspaceId=${workspaceId}&year=${year}`, headers: memberHeaders });
  assert.equal(invalidRange.statusCode, 400);
  await app.close();
});

test("member profile accepts a local uploaded-image URL but rejects arbitrary relative paths", async () => {
  const store = new Store(); store.emailCodes.set("profile-picture@example.com", { code: "123456", expiresAt: Date.now() + 60_000 }); const app = await buildApp(store);
  const registration = await app.inject({ method: "POST", url: "/member/register", payload: { email: "profile-picture@example.com", password: "password123", code: "123456" } });
  const memberId = app.jwt.decode<{ sub: string }>(registration.json().data.accessToken)?.sub; assert.ok(memberId);
  const headers = { authorization: `Bearer ${registration.json().data.accessToken}` };
  const imageUrl = "/uploads/c4c25038-3eed-4942-819d-4ed17813be09-avatar.png";
  const workspaceId = (await app.inject({ method: "POST", url: "/workspace", headers, payload: { name: "프로필 학교" } })).json().data as string;
  assert.equal((await app.inject({ method: "PATCH", url: "/member/edit", headers, payload: { name: "새 이름", birth: "2000-01-02", picture: imageUrl } })).statusCode, 200);
  assert.equal(store.members.get(memberId)?.picture, imageUrl);
  assert.equal(store.members.get(memberId)?.birth, "2000-01-02");
  const profile = await app.inject({ url: `/profile/me?workspaceId=${workspaceId}`, headers });
  assert.equal(profile.json().data.profileImage, imageUrl);
  assert.equal(profile.json().data.birth, "2000-01-02");
  assert.deepEqual(profile.json().data.member, { id: memberId, email: "profile-picture@example.com", birth: "2000-01-02", name: "새 이름", picture: imageUrl });
  assert.equal((await app.inject({ method: "PATCH", url: "/member/edit", headers, payload: { picture: "/uploads/../../etc/passwd" } })).statusCode, 400);
  await app.close();
});

test("account withdrawal invalidates outstanding access and refresh tokens", async () => {
  const store = new Store(); store.emailCodes.set("withdraw@example.com", { code: "123456", expiresAt: Date.now() + 60_000 }); const app = await buildApp(store);
  const registration = await app.inject({ method: "POST", url: "/member/register", payload: { email: "withdraw@example.com", password: "password123", code: "123456" } });
  const tokens = registration.json().data as { accessToken: string; refreshToken: string };
  const headers = { authorization: `Bearer ${tokens.accessToken}` };
  const memberId = app.jwt.decode<{ sub: string }>(tokens.accessToken)?.sub; assert.ok(memberId);
  store.deviceTokens.set(memberId, ["device-token"]);
  assert.equal((await app.inject({ method: "DELETE", url: "/member/remove", headers })).statusCode, 200);
  assert.equal(store.members.get(memberId)?.deleted, true);
  assert.equal(store.members.has(memberId), true);
  assert.equal(store.deviceTokens.has(memberId), false);
  assert.equal((await app.inject({ method: "GET", url: "/member/myInfo", headers })).statusCode, 404);
  assert.equal((await app.inject({ method: "GET", url: `/member/refresh?token=${encodeURIComponent(tokens.refreshToken)}` })).statusCode, 401);
  assert.equal((await app.inject({ method: "POST", url: "/member/login", payload: { email: "withdraw@example.com", password: "password123" } })).statusCode, 401);
  await app.close();
});

test("email code must be issued before email-password registration", async () => {
  const store = new Store(); const app = await buildApp(store);
  const before = await app.inject({ method: "POST", url: "/member/register", payload: { email: "verify@example.com", password: "password123", code: "123456" } }); assert.equal(before.statusCode, 409);
  const sent = await app.inject({ url: "/email/send?email=verify@example.com" }); assert.equal(sent.statusCode, 200);
  const issued = store.emailCodes.get("verify@example.com"); assert.match(issued?.code ?? "", /^\d{6}$/);
  const confirm = await app.inject({ method: "POST", url: "/email/confirm", payload: { email: "verify@example.com", code: issued?.code } }); assert.equal(confirm.statusCode, 200);
  const registered = await app.inject({ method: "POST", url: "/member/register", payload: { email: "verify@example.com", password: "password123", code: issued?.code } }); assert.equal(registered.statusCode, 200);
  await app.close();
});

test("a member can remove a saved Google Classroom connection", async () => {
  const store = new Store(); store.emailCodes.set("google@example.com", { code: "123456", expiresAt: Date.now() + 60_000 }); const app = await buildApp(store);
  const registration = await app.inject({ method: "POST", url: "/member/register", payload: { email: "google@example.com", password: "password123", code: "123456" } });
  const memberId = app.jwt.decode<{ sub: string }>(registration.json().data.accessToken)?.sub; assert.ok(memberId);
  store.oauth.set(`${memberId}:google`, { provider: "google", accessToken: "access", refreshToken: "refresh" });
  const response = await app.inject({ method: "DELETE", url: "/oauth/google/remove", headers: { authorization: `Bearer ${registration.json().data.accessToken}` } });
  assert.equal(response.statusCode, 200); assert.equal(store.oauth.has(`${memberId}:google`), false);
  await app.close();
});

test("a member can register and remove a device notification token", async () => {
  const store = new Store(); store.emailCodes.set("device@example.com", { code: "123456", expiresAt: Date.now() + 60_000 }); const app = await buildApp(store);
  const registration = await app.inject({ method: "POST", url: "/member/register", payload: { email: "device@example.com", password: "password123", code: "123456" } });
  const authorization = { authorization: `Bearer ${registration.json().data.accessToken}` };
  const registered = await app.inject({ method: "POST", url: "/member/device-token", headers: authorization, payload: { token: "fcm-device-token" } });
  assert.equal(registered.statusCode, 200); assert.deepEqual([...store.deviceTokens.values()], [["fcm-device-token"]]);
  const removed = await app.inject({ method: "DELETE", url: "/member/device-token", headers: authorization, payload: { token: "fcm-device-token" } });
  assert.equal(removed.statusCode, 200); assert.deepEqual([...store.deviceTokens.values()], [[]]);
  await app.close();
});

test("legacy desktop logout clears its fcmToken and invalidates the refresh token", async () => {
  const store = new Store(); store.emailCodes.set("legacy-logout@example.com", { code: "123456", expiresAt: Date.now() + 60_000 }); const app = await buildApp(store);
  const registration = await app.inject({ method: "POST", url: "/member/register", payload: { email: "legacy-logout@example.com", password: "password123", code: "123456" } });
  const tokens = registration.json().data as { accessToken: string; refreshToken: string };
  const memberId = app.jwt.decode<{ sub: string }>(tokens.accessToken)?.sub; assert.ok(memberId);
  store.deviceTokens.set(memberId, ["legacy-fcm-token"]);
  const response = await app.inject({ method: "POST", url: "/member/logout", headers: { authorization: `Bearer ${tokens.accessToken}` }, payload: { fcmToken: "legacy-fcm-token" } });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(store.deviceTokens.get(memberId), []);
  assert.equal((await app.inject({ url: `/member/refresh?token=${encodeURIComponent(tokens.refreshToken)}` })).statusCode, 401);
  await app.close();
});

test("email login accepts the original client token field", async () => {
  const store = new Store(); store.emailCodes.set("legacy-token@example.com", { code: "123456", expiresAt: Date.now() + 60_000 }); const app = await buildApp(store);
  await app.inject({ method: "POST", url: "/member/register", payload: { email: "legacy-token@example.com", password: "password123", code: "123456" } });
  const login = await app.inject({ method: "POST", url: "/member/login", payload: { email: "legacy-token@example.com", password: "password123", token: "legacy-fcm-token" } });
  assert.equal(login.statusCode, 200); assert.deepEqual([...store.deviceTokens.values()], [["legacy-fcm-token"]]);
  await app.close();
});

test("empty optional push tokens do not block legacy auth or logout", async () => {
  const store = new Store(); store.emailCodes.set("empty-token@example.com", { code: "123456", expiresAt: Date.now() + 60_000 }); const app = await buildApp(store);
  const registered = await app.inject({ method: "POST", url: "/member/register", payload: { email: "empty-token@example.com", password: "password123", code: "123456", token: "" } });
  assert.equal(registered.statusCode, 200);
  const login = await app.inject({ method: "POST", url: "/member/login", payload: { email: "empty-token@example.com", password: "password123", token: "" } });
  assert.equal(login.statusCode, 200);
  const tokens = login.json().data as { accessToken: string; refreshToken: string };
  const memberId = app.jwt.decode<{ sub: string }>(tokens.accessToken)?.sub; assert.ok(memberId);
  assert.equal(store.deviceTokens.has(memberId), false);
  const logout = await app.inject({ method: "POST", url: "/member/logout", headers: { authorization: `Bearer ${tokens.accessToken}` }, payload: { fcmToken: "" } });
  assert.equal(logout.statusCode, 200);
  assert.equal(authenticateOAuthSchema.parse({ code: "authorization-code", token: "" }).token, undefined);
  await app.close();
});

test("workspace retains requested roles and permits a teacher announcement", async () => {
  const store = new Store(); const app = await buildApp(store);
  for (const email of ["role-owner@example.com", "teacher@example.com"]) store.emailCodes.set(email, { code: "123456", expiresAt: Date.now() + 60_000 });
  const owner = await app.inject({ method: "POST", url: "/member/register", payload: { email: "role-owner@example.com", password: "password123", code: "123456" } });
  const teacher = await app.inject({ method: "POST", url: "/member/register", payload: { email: "teacher@example.com", password: "password123", code: "123456" } });
  const ownerHeaders = { authorization: `Bearer ${owner.json().data.accessToken}` }; const teacherHeaders = { authorization: `Bearer ${teacher.json().data.accessToken}` };
  const created = await app.inject({ method: "POST", url: "/workspace", headers: ownerHeaders, payload: { name: "역할 학교" } }); const workspaceId = created.json().data as string;
  const code = (await app.inject({ method: "GET", url: `/workspace/code/${workspaceId}`, headers: ownerHeaders })).json().data as string;
  assert.equal((await app.inject({ method: "POST", url: "/workspace/join", headers: teacherHeaders, payload: { workspaceId, workspaceCode: code, role: "TEACHER" } })).statusCode, 200);
  const teacherId = app.jwt.decode<{ sub: string }>(teacher.json().data.accessToken)?.sub; assert.ok(teacherId);
  assert.equal((await app.inject({ method: "PATCH", url: "/workspace/add", headers: ownerHeaders, payload: { workspaceId, userSet: [teacherId], role: "TEACHER" } })).statusCode, 200);
  assert.equal(store.profiles.get(`${workspaceId}:${teacherId}`)?.role, "TEACHER");
  assert.equal((await app.inject({ method: "PATCH", url: "/workspace/permission", headers: ownerHeaders, payload: { workspaceId, memberId: teacherId, role: "MIDDLE_ADMIN" } })).statusCode, 200);
  assert.equal(store.profiles.get(`${workspaceId}:${teacherId}`)?.role, "MIDDLE_ADMIN");
  assert.equal((await app.inject({ method: "PATCH", url: `/profile/${workspaceId}`, headers: teacherHeaders, payload: { role: "ADMIN", nick: "별명", status: "안녕하세요", spot: "담임" } })).statusCode, 200);
  assert.equal(store.profiles.get(`${workspaceId}:${teacherId}`)?.role, "MIDDLE_ADMIN");
  assert.equal(store.profiles.get(`${workspaceId}:${teacherId}`)?.nick, "별명");
  const notification = await app.inject({ method: "POST", url: "/notification", headers: teacherHeaders, payload: { workspaceId, title: "시험", content: "다음 주 시험입니다" } });
  assert.equal(notification.statusCode, 200);
  assert.equal(notification.json().data.userName, "teacher"); assert.deepEqual(notification.json().data.emoji, []); assert.equal(notification.json().data.createdDate, notification.json().data.lastModifiedDate);
  const notificationId = notification.json().data.id as string;
  assert.equal((await app.inject({ method: "PATCH", url: "/notification", headers: teacherHeaders, payload: { id: notificationId, workspaceId: "00000000-0000-4000-8000-000000000099", title: "시험 일정", content: "다음 주 시험입니다" } })).statusCode, 200);
  assert.equal(store.notifications.get(notificationId)?.title, "시험 일정");
  assert.equal(store.notifications.get(notificationId)?.workspaceId, workspaceId);
  const refreshedNotices = await app.inject({ method: "GET", url: `/notification/${workspaceId}`, headers: teacherHeaders });
  assert.equal(refreshedNotices.json().data[0].lastModifiedDate, store.notifications.get(notificationId)?.updatedAt);
  assert.equal((await app.inject({ method: "DELETE", url: `/notification/${workspaceId}/${notificationId}`, headers: teacherHeaders })).statusCode, 200);
  assert.equal(store.notifications.has(notificationId), false);
  const roomId = (await app.inject({ method: "POST", url: "/chat/group/create", headers: ownerHeaders, payload: { workspaceId, name: "교사 방", memberIds: [teacherId] } })).json().data as string;
  assert.equal((await app.inject({ method: "PATCH", url: "/workspace/kick", headers: ownerHeaders, payload: { workspaceId, memberId: teacherId } })).statusCode, 200);
  assert.equal(store.rooms.get(roomId)?.memberIds.includes(teacherId), false);
  assert.equal((await app.inject({ method: "GET", url: `/chat/group/search/room/${roomId}`, headers: teacherHeaders })).statusCode, 404);
  await app.close();
});

test("workspace admins can update its name and image while students cannot", async () => {
  const store = new Store(); const ownerId = "00000000-0000-4000-8000-000000000041"; const studentId = "00000000-0000-4000-8000-000000000042"; const workspaceId = "00000000-0000-4000-8000-000000000043";
  store.members.set(ownerId, { id: ownerId, email: "workspace-owner@example.com", name: "관리자" }); store.members.set(studentId, { id: studentId, email: "workspace-student@example.com", name: "학생" });
  store.workspaces.set(workspaceId, { id: workspaceId, code: "UPDATES", name: "변경 전", members: [ownerId, studentId], waitlist: [], ownerId });
  const app = await buildApp(store); const ownerAuth = { authorization: `Bearer ${app.jwt.sign({ sub: ownerId })}` }; const studentAuth = { authorization: `Bearer ${app.jwt.sign({ sub: studentId })}` };
  try {
    const updated = await app.inject({ method: "PATCH", url: "/workspace", headers: ownerAuth, payload: { workspaceId, workspaceName: "변경 후", workspaceImgUrl: "https://example.test/school.png" } });
    assert.equal(updated.statusCode, 200); assert.equal(store.workspaces.get(workspaceId)?.name, "변경 후"); assert.equal(store.workspaces.get(workspaceId)?.image, "https://example.test/school.png");
    assert.equal((await app.inject({ method: "PATCH", url: "/workspace", headers: studentAuth, payload: { workspaceId, name: "불가" } })).statusCode, 403);
    assert.equal((await app.inject({ method: "PATCH", url: "/workspace", headers: ownerAuth, payload: { workspaceId } })).statusCode, 400);
  } finally { await app.close(); }
});

test("workspace member chart groups complete legacy profiles by role and department", async () => {
  const store = new Store(); const workspaceId = "00000000-0000-4000-8000-000000000051"; const ids = ["00000000-0000-4000-8000-000000000052", "00000000-0000-4000-8000-000000000053", "00000000-0000-4000-8000-000000000054", "00000000-0000-4000-8000-000000000055"];
  const [adminId, managerId, teacherId, studentId] = ids; const roles = ["ADMIN", "MIDDLE_ADMIN", "TEACHER", "STUDENT"] as const; const belongs = ["교무실", "학생부", "수학과", "2학년 1반"];
  for (const [index, id] of ids.entries()) { store.members.set(id, { id, email: `chart-${index}@example.com`, name: `구성원${index}` }); store.profiles.set(`${workspaceId}:${id}`, { id, email: `chart-${index}@example.com`, name: `구성원${index}`, workspaceId, role: roles[index], belong: belongs[index], spot: index === 2 ? "담임" : "" }); }
  store.workspaces.set(workspaceId, { id: workspaceId, code: "CHART", name: "조직도 학교", members: ids, waitlist: [], ownerId: adminId });
  const app = await buildApp(store); const authorization = `Bearer ${app.jwt.sign({ sub: studentId })}`;
  try {
    const result = await app.inject({ method: "GET", url: `/workspace/members/chart?workspaceId=${workspaceId}`, headers: { authorization } }); const chart = result.json().data;
    assert.deepEqual(Object.keys(chart).sort(), ["admin", "middleAdmin", "students", "teachers"]);
    assert.equal(chart.admin["교무실"][0].member.name, "구성원0"); assert.equal(chart.admin["교무실"][0].permission, "ADMIN");
    assert.equal(chart.middleAdmin["학생부"][0].permission, "MIDDLE_ADMIN"); assert.equal(chart.teachers["수학과"][0].spot, "담임"); assert.equal(chart.students["2학년 1반"][0].member.id, studentId);
  } finally { await app.close(); }
});

test("announcements are returned newest first, matching the original descending notice feed", async () => {
  const store = new Store(); const memberId = "00000000-0000-4000-8000-000000000031"; const workspaceId = "00000000-0000-4000-8000-000000000032";
  store.members.set(memberId, { id: memberId, email: "notice-order@example.com", name: "공지 사용자" });
  store.workspaces.set(workspaceId, { id: workspaceId, code: "NOTICE", name: "공지 학교", members: [memberId], waitlist: [], ownerId: memberId });
  for (const [id, title, createdAt] of [["00000000-0000-4000-8000-000000000033", "오래된 공지", "2025-01-01T00:00:00.000Z"], ["00000000-0000-4000-8000-000000000034", "새 공지", "2025-02-01T00:00:00.000Z"]]) {
    store.notifications.set(id, { id, workspaceId, title, content: title, authorId: memberId, createdAt, emojis: title === "새 공지" ? { "👍": [memberId] } : {} });
  }
  const app = await buildApp(store); const authorization = `Bearer ${app.jwt.sign({ sub: memberId })}`;
  try {
  const response = await app.inject({ method: "GET", url: `/notification/${workspaceId}`, headers: { authorization } });
    assert.deepEqual(response.json().data.map((item: { title: string }) => item.title), ["새 공지", "오래된 공지"]);
    assert.equal(response.json().data[0].userName, "공지 사용자"); assert.equal(response.json().data[0].userId, memberId); assert.deepEqual(response.json().data[0].emoji, [{ emoji: "👍", userList: [memberId] }]); assert.equal(response.json().data[0].createdDate, response.json().data[0].lastModifiedDate);
  } finally { await app.close(); }
});

test("announcement list follows the native page and size contract", async () => {
  const store = new Store();
  const memberId = "00000000-0000-4000-8000-000000000041";
  const workspaceId = "00000000-0000-4000-8000-000000000042";
  store.members.set(memberId, { id: memberId, email: "notice-pages@example.com", name: "페이지 사용자" });
  store.workspaces.set(workspaceId, { id: workspaceId, code: "PAGE", name: "공지 페이지", members: [memberId], waitlist: [], ownerId: memberId });
  for (let index = 1; index <= 25; index++) {
    const suffix = String(index).padStart(12, "0");
    const id = `00000000-0000-4000-8000-${suffix}`;
    store.notifications.set(id, { id, workspaceId, title: `공지 ${index}`, content: "본문", authorId: memberId, createdAt: new Date(Date.UTC(2025, 0, index)).toISOString(), emojis: {} });
  }
  const app = await buildApp(store);
  const authorization = `Bearer ${app.jwt.sign({ sub: memberId })}`;
  try {
    const first = await app.inject({ method: "GET", url: `/notification/${workspaceId}`, headers: { authorization } });
    const second = await app.inject({ method: "GET", url: `/notification/${workspaceId}?page=1&size=20`, headers: { authorization } });
    const third = await app.inject({ method: "GET", url: `/notification/${workspaceId}?page=2&size=20`, headers: { authorization } });
    assert.equal(first.json().data.length, 20);
    assert.equal(first.json().data[0].title, "공지 25");
    assert.equal(second.json().data.length, 5);
    assert.equal(second.json().data[0].title, "공지 5");
    assert.deepEqual(third.json().data, []);
  } finally { await app.close(); }
});

test("legacy desktop workspace administration response and request fields remain supported", async () => {
  const store = new Store(); const app = await buildApp(store);
  for (const email of ["legacy-admin@example.com", "legacy-student@example.com"]) store.emailCodes.set(email, { code: "123456", expiresAt: Date.now() + 60_000 });
  const register = async (email: string) => app.inject({ method: "POST", url: "/member/register", payload: { email, password: "password123", code: "123456" } });
  const [owner, student] = await Promise.all([register("legacy-admin@example.com"), register("legacy-student@example.com")]);
  const ownerHeaders = { authorization: `Bearer ${owner.json().data.accessToken}` }; const studentHeaders = { authorization: `Bearer ${student.json().data.accessToken}` };
  const studentId = app.jwt.decode<{ sub: string }>(student.json().data.accessToken)?.sub; assert.ok(studentId);
  const workspaceId = (await app.inject({ method: "POST", url: "/workspace", headers: ownerHeaders, payload: { name: "관리 호환 학교" } })).json().data as string;
  const workspace = store.workspaces.get(workspaceId); assert.ok(workspace);
  workspace.waitlist.push(studentId); store.waitlistRoles.set(`${workspaceId}:${studentId}`, "STUDENT");
  const myWaitlist = await app.inject({ url: "/workspace/my/wait-list", headers: studentHeaders });
  assert.equal(myWaitlist.statusCode, 200);
  assert.equal(myWaitlist.json().data[0].workspaceId, workspaceId);
  assert.equal(myWaitlist.json().data[0].workspaceName, "관리 호환 학교");
  assert.equal(myWaitlist.json().data[0].workspaceImageUrl, "");
  const waitlist = await app.inject({ url: `/workspace/wait-list?workspaceId=${workspaceId}&role=STUDENT`, headers: ownerHeaders });
  assert.equal(waitlist.json().data[0].permission, "STUDENT");
  assert.equal((await app.inject({ method: "PATCH", url: "/workspace/add", headers: ownerHeaders, payload: { workspaceId, userSet: [studentId], role: "STUDENT" } })).statusCode, 200);
  const members = await app.inject({ url: `/workspace/members?workspaceId=${workspaceId}`, headers: ownerHeaders });
  const listedStudent = members.json().data.find((entry: { id: string }) => entry.id === studentId);
  assert.equal(listedStudent.member.nick, "legacy-student");
  assert.equal(listedStudent.permission, "STUDENT");
  assert.equal((await app.inject({ method: "PATCH", url: `/profile/schidnum/${workspaceId}`, headers: ownerHeaders, payload: { id: studentId, schGrade: 2, schClass: 3, schNumber: 4 } })).statusCode, 200);
  assert.deepEqual([store.profiles.get(`${workspaceId}:${studentId}`)?.grade, store.profiles.get(`${workspaceId}:${studentId}`)?.class, store.profiles.get(`${workspaceId}:${studentId}`)?.number], [2, 3, 4]);
  assert.equal((await app.inject({ method: "PATCH", url: "/workspace/permission", headers: ownerHeaders, payload: { workspaceId, memberId: studentId, workspaceRole: "MIDDLE_ADMIN" } })).statusCode, 200);
  assert.equal(store.profiles.get(`${workspaceId}:${studentId}`)?.role, "MIDDLE_ADMIN");
  const managedProfile = await app.inject({ url: `/profile/me?workspaceId=${workspaceId}`, headers: studentHeaders });
  assert.equal(managedProfile.json().data.permission, "MIDDLE_ADMIN");
  const updatedMembers = await app.inject({ url: `/workspace/members?workspaceId=${workspaceId}`, headers: ownerHeaders });
  assert.equal(updatedMembers.json().data.find((entry: { id: string }) => entry.id === studentId).permission, "MIDDLE_ADMIN");
  assert.equal((await app.inject({ method: "PATCH", url: "/workspace/kick", headers: ownerHeaders, payload: { workspaceId, memberList: [studentId] } })).statusCode, 200);
  assert.equal(store.workspaces.get(workspaceId)?.members.includes(studentId), false);
  assert.equal((await app.inject({ url: `/profile/me?workspaceId=${workspaceId}`, headers: studentHeaders })).statusCode, 403);
  await app.close();
});

test("workspace admins can approve or reject matching join requests, while members cannot reject others", async () => {
  const store = new Store(); const app = await buildApp(store);
  for (const email of ["join-owner@example.com", "join-applicant@example.com", "join-outsider@example.com"]) store.emailCodes.set(email, { code: "123456", expiresAt: Date.now() + 60_000 });
  const register = async (email: string) => app.inject({ method: "POST", url: "/member/register", payload: { email, password: "password123", code: "123456" } });
  const owner = await register("join-owner@example.com"); const applicant = await register("join-applicant@example.com"); const outsider = await register("join-outsider@example.com");
  const ownerHeaders = { authorization: `Bearer ${owner.json().data.accessToken}` }; const applicantHeaders = { authorization: `Bearer ${applicant.json().data.accessToken}` }; const outsiderHeaders = { authorization: `Bearer ${outsider.json().data.accessToken}` };
  const created = await app.inject({ method: "POST", url: "/workspace", headers: ownerHeaders, payload: { name: "가입 흐름 학교" } }); const workspaceId = created.json().data as string;
  const code = (await app.inject({ method: "GET", url: `/workspace/code/${workspaceId}`, headers: ownerHeaders })).json().data as string;
  const publicSearch = await app.inject({ url: `/workspace/search/${code}` });
  assert.equal(publicSearch.statusCode, 200);
  assert.equal(publicSearch.json().data.workspaceId, workspaceId);
  const applicantId = app.jwt.decode<{ sub: string }>(applicant.json().data.accessToken)?.sub; assert.ok(applicantId);
  const unsupportedRole = await app.inject({ method: "POST", url: "/workspace/join", headers: applicantHeaders, payload: { code, role: "MIDDLE_ADMIN" } });
  assert.equal(unsupportedRole.statusCode, 400);
  assert.equal(store.workspaces.get(workspaceId)?.waitlist.includes(applicantId), false);
  assert.equal((await app.inject({ method: "POST", url: "/workspace/join", headers: applicantHeaders, payload: { code } })).statusCode, 200);
  const myRequests = await app.inject({ method: "GET", url: "/workspace/my/wait-list", headers: applicantHeaders });
  assert.equal(myRequests.json().data[0].workspaceId, workspaceId);
  assert.equal(myRequests.json().data[0].workspaceName, "가입 흐름 학교");
  assert.equal((await app.inject({ method: "DELETE", url: "/workspace/cancel", headers: applicantHeaders, payload: { workspaceId } })).statusCode, 200);
  assert.equal((await app.inject({ method: "GET", url: "/workspace/my/wait-list", headers: applicantHeaders })).json().data.length, 0);
  assert.equal((await app.inject({ method: "POST", url: "/workspace/join", headers: applicantHeaders, payload: { code } })).statusCode, 200);
  assert.equal((await app.inject({ method: "GET", url: `/workspace/wait-list?workspaceId=${workspaceId}&role=STUDENT`, headers: ownerHeaders })).json().data.length, 1);
  assert.equal((await app.inject({ method: "GET", url: `/workspace/wait-list?workspaceId=${workspaceId}&role=MIDDLE_ADMIN`, headers: ownerHeaders })).statusCode, 400);
  assert.equal((await app.inject({ method: "DELETE", url: "/workspace/cancel", headers: outsiderHeaders, payload: { workspaceId, userSet: [applicantId], role: "STUDENT" } })).statusCode, 403);
  assert.equal((await app.inject({ method: "DELETE", url: "/workspace/cancel", headers: ownerHeaders, payload: { workspaceId, userSet: [applicantId], role: "STUDENT" } })).statusCode, 200);
  assert.equal((await app.inject({ method: "GET", url: `/workspace/wait-list?workspaceId=${workspaceId}&role=STUDENT`, headers: ownerHeaders })).json().data.length, 0);
  assert.equal((await app.inject({ method: "POST", url: "/workspace/join", headers: applicantHeaders, payload: { code } })).statusCode, 200);
  assert.equal((await app.inject({ method: "PATCH", url: "/workspace/add", headers: ownerHeaders, payload: { workspaceId, memberId: applicantId, role: "STUDENT" } })).statusCode, 200);
  assert.equal(store.workspaces.get(workspaceId)?.members.includes(applicantId), true);
  await app.close();
});

test("failed multi-member approval rolls back every workspace change", async () => {
  const directory = mkdtempSync(join(tmpdir(), "seugi-rollback-"));
  const store = new Store(join(directory, "state.json")); const app = await buildApp(store);
  try {
    store.emailCodes.set("rollback-owner@example.com", { code: "123456", expiresAt: Date.now() + 60_000 });
    store.emailCodes.set("rollback-applicant@example.com", { code: "123456", expiresAt: Date.now() + 60_000 });
    const owner = await app.inject({ method: "POST", url: "/member/register", payload: { email: "rollback-owner@example.com", password: "password123", code: "123456" } });
    const applicant = await app.inject({ method: "POST", url: "/member/register", payload: { email: "rollback-applicant@example.com", password: "password123", code: "123456" } });
    const ownerHeaders = { authorization: `Bearer ${owner.json().data.accessToken}` };
    const applicantHeaders = { authorization: `Bearer ${applicant.json().data.accessToken}` };
    const applicantId = app.jwt.decode<{ sub: string }>(applicant.json().data.accessToken)!.sub;
    const workspaceId = (await app.inject({ method: "POST", url: "/workspace", headers: ownerHeaders, payload: { name: "롤백 검증 학교" } })).json().data as string;
    const code = (await app.inject({ url: `/workspace/code/${workspaceId}`, headers: ownerHeaders })).json().data as string;
    await app.inject({ method: "POST", url: "/workspace/join", headers: applicantHeaders, payload: { code } });

    const response = await app.inject({ method: "PATCH", url: "/workspace/add", headers: ownerHeaders, payload: { workspaceId, userSet: [applicantId, randomUUID()], role: "STUDENT" } });
    assert.equal(response.statusCode, 404);
    assert.equal(store.workspaces.get(workspaceId)?.waitlist.includes(applicantId), true);
    assert.equal(store.workspaces.get(workspaceId)?.members.includes(applicantId), false);
    assert.equal(store.profiles.has(`${workspaceId}:${applicantId}`), false);
    const reloaded = new Store(join(directory, "state.json"));
    reloaded.load();
    assert.equal(reloaded.workspaces.get(workspaceId)?.waitlist.includes(applicantId), true);
    assert.equal(reloaded.workspaces.get(workspaceId)?.members.includes(applicantId), false);
  } finally {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("workspace data rejects unauthenticated and non-member access with HTTP semantics", async () => {
  const store = new Store(); const app = await buildApp(store);
  for (const email of ["owner@example.com", "other@example.com", "student@example.com", "teacher@example.com"]) store.emailCodes.set(email, { code: "123456", expiresAt: Date.now() + 60_000 });
  const owner = await app.inject({ method: "POST", url: "/member/register", payload: { email: "owner@example.com", password: "password123", code: "123456" } });
  const other = await app.inject({ method: "POST", url: "/member/register", payload: { email: "other@example.com", password: "password123", code: "123456" } });
  const student = await app.inject({ method: "POST", url: "/member/register", payload: { email: "student@example.com", password: "password123", code: "123456" } });
  const teacher = await app.inject({ method: "POST", url: "/member/register", payload: { email: "teacher@example.com", password: "password123", code: "123456" } });
  const workspace = await app.inject({ method: "POST", url: "/workspace", headers: { authorization: `Bearer ${owner.json().data.accessToken}` }, payload: { name: "권한 학교" } });
  const ownerId = app.jwt.decode<{ sub: string }>(owner.json().data.accessToken)?.sub; assert.ok(ownerId);
  const otherId = app.jwt.decode<{ sub: string }>(other.json().data.accessToken)?.sub; assert.ok(otherId);
  const studentId = app.jwt.decode<{ sub: string }>(student.json().data.accessToken)?.sub; assert.ok(studentId);
  const teacherId = app.jwt.decode<{ sub: string }>(teacher.json().data.accessToken)?.sub; assert.ok(teacherId);
  const workspaceId = workspace.json().data as string;
  const workspaceRecord = store.workspaces.get(workspaceId); assert.ok(workspaceRecord);
  workspaceRecord.members.push(studentId, teacherId);
  store.profiles.set(`${workspaceId}:${studentId}`, { ...store.requireMember(studentId), workspaceId, role: "STUDENT" });
  store.profiles.set(`${workspaceId}:${teacherId}`, { ...store.requireMember(teacherId), workspaceId, role: "TEACHER" });
  const ownerHeaders = { authorization: `Bearer ${owner.json().data.accessToken}` };
  const studentHeaders = { authorization: `Bearer ${student.json().data.accessToken}` };
  const teacherHeaders = { authorization: `Bearer ${teacher.json().data.accessToken}` };
  const workspaceUrl = `/workspace/${workspaceId}/notifications`;
  const codeUrl = `/workspace/code/${workspaceId}`;
  assert.equal((await app.inject({ url: codeUrl, headers: ownerHeaders })).statusCode, 200);
  assert.equal((await app.inject({ url: codeUrl, headers: teacherHeaders })).statusCode, 200);
  assert.equal((await app.inject({ url: codeUrl, headers: studentHeaders })).statusCode, 403);
  assert.equal((await app.inject({ method: "GET", url: workspaceUrl, headers: { authorization: `Bearer ${owner.json().data.accessToken}` } })).json().data, true);
  assert.equal((await app.inject({ method: "PATCH", url: workspaceUrl, headers: { authorization: `Bearer ${owner.json().data.accessToken}` }, payload: { receivePush: false } })).json().data, false);
  assert.equal((await app.inject({ method: "GET", url: workspaceUrl, headers: { authorization: `Bearer ${owner.json().data.accessToken}` } })).json().data, false);
  assert.equal((await app.inject({ method: "GET", url: workspaceUrl, headers: { authorization: `Bearer ${other.json().data.accessToken}` } })).statusCode, 403);
  store.deviceTokens.set(ownerId, ["muted-device"]);
  assert.deepEqual(store.pushTokensForWorkspace(workspace.json().data, [ownerId]), []);
  assert.equal((await app.inject({ method: "GET", url: `/task/${workspace.json().data}` })).statusCode, 401);
  assert.equal((await app.inject({ method: "GET", url: `/task/${workspace.json().data}`, headers: { authorization: `Bearer ${other.json().data.accessToken}` } })).statusCode, 403);
  assert.equal((await app.inject({ method: "GET", url: `/profile/me?workspaceId=${workspace.json().data}`, headers: { authorization: `Bearer ${other.json().data.accessToken}` } })).statusCode, 403);
  assert.equal((await app.inject({ method: "PATCH", url: `/profile/schidnum/${workspace.json().data}`, headers: { authorization: `Bearer ${other.json().data.accessToken}` }, payload: { grade: 1, class: 1, number: 1 } })).statusCode, 403);
  assert.equal((await app.inject({ method: "GET", url: `/profile/others?workspaceId=${workspace.json().data}&memberId=${otherId}` })).statusCode, 401);
  assert.equal((await app.inject({ method: "GET", url: `/profile/others?workspaceId=${workspace.json().data}&memberId=${otherId}`, headers: { authorization: `Bearer ${other.json().data.accessToken}` } })).statusCode, 403);
  const notice = await app.inject({ method: "POST", url: "/notification", headers: { authorization: `Bearer ${owner.json().data.accessToken}` }, payload: { workspaceId: workspace.json().data, title: "안내", content: "공지입니다" } });
  assert.equal((await app.inject({ method: "PATCH", url: "/notification/emoji", headers: { authorization: `Bearer ${other.json().data.accessToken}` }, payload: { notificationId: notice.json().data.id, emoji: "👍" } })).statusCode, 403);
  const room = await app.inject({ method: "POST", url: "/chat/group/create", headers: { authorization: `Bearer ${owner.json().data.accessToken}` }, payload: { workspaceId: workspace.json().data, name: "비공개", memberIds: [] } });
  const messageId = store.id(); store.messages.set(messageId, { id: messageId, roomId: room.json().data, senderId: ownerId, message: "메시지", createdAt: new Date().toISOString(), emojis: {} });
  assert.equal((await app.inject({ method: "PUT", url: "/message/emoji", headers: { authorization: `Bearer ${other.json().data.accessToken}` }, payload: { messageId, emoji: "👍" } })).statusCode, 403);
  await app.close();
});

test("timetable routes preserve the upstream date/class contract and protect teacher edits", async () => {
  const store = new Store(); const app = await buildApp(store);
  for (const email of ["table-owner@example.com", "table-student@example.com"]) store.emailCodes.set(email, { code: "123456", expiresAt: Date.now() + 60_000 });
  const register = async (email: string) => app.inject({ method: "POST", url: "/member/register", payload: { email, password: "password123", code: "123456" } });
  const owner = await register("table-owner@example.com"); const student = await register("table-student@example.com");
  const ownerId = app.jwt.decode<{ sub: string }>(owner.json().data.accessToken)?.sub; const studentId = app.jwt.decode<{ sub: string }>(student.json().data.accessToken)?.sub; assert.ok(ownerId); assert.ok(studentId);
  const ownerHeaders = { authorization: `Bearer ${owner.json().data.accessToken}` }; const studentHeaders = { authorization: `Bearer ${student.json().data.accessToken}` };
  const workspaceId = (await app.inject({ method: "POST", url: "/workspace", headers: ownerHeaders, payload: { name: "시간표 학교" } })).json().data as string;
  const workspace = store.workspaces.get(workspaceId); assert.ok(workspace); workspace.members.push(studentId);
  store.profiles.set(`${workspaceId}:${ownerId}`, { ...store.requireMember(ownerId), workspaceId, role: "TEACHER", grade: 2, class: 3 });
  store.profiles.set(`${workspaceId}:${studentId}`, { ...store.requireMember(studentId), workspaceId, role: "STUDENT", grade: 2, class: 3 });
  const day = new Date(); const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  assert.equal((await app.inject({ method: "POST", url: "/timetable", headers: ownerHeaders, payload: { workspaceId, grade: 2, classNum: 3, time: 1, subject: "수학", date } })).statusCode, 200);
  const id = [...store.timetables.keys()][0]; assert.ok(id);
  assert.equal((await app.inject({ method: "PATCH", url: "/timetable", headers: studentHeaders, payload: { id, subject: "무단 변경" } })).statusCode, 403);
  assert.equal((await app.inject({ method: "PATCH", url: "/timetable", headers: ownerHeaders, payload: { id, subject: "대수" } })).statusCode, 200);
  const today = await app.inject({ url: `/timetable/day?workspaceId=${workspaceId}`, headers: studentHeaders });
  assert.deepEqual(today.json().data.map((entry: { subject: string; grade: string; classNum: string }) => [entry.subject, entry.grade, entry.classNum]), [["대수", "2", "3"]]);
  assert.equal((await app.inject({ method: "DELETE", url: `/timetable/${id}`, headers: ownerHeaders })).statusCode, 200);
  await app.close();
});

test("group room member invitations follow native behavior while administration requires leadership", async () => {
  const store = new Store(); const app = await buildApp(store);
  const emails = ["room-admin@example.com", "room-member@example.com", "room-outsider@example.com", "room-invitee@example.com"];
  for (const email of emails) store.emailCodes.set(email, { code: "123456", expiresAt: Date.now() + 60_000 });
  const register = async (email: string) => app.inject({ method: "POST", url: "/member/register", payload: { email, password: "password123", code: "123456" } });
  const [owner, member, outsider, invitee] = await Promise.all(emails.map(register));
  const token = (response: typeof owner) => response.json().data.accessToken as string;
  const ownerId = app.jwt.decode<{ sub: string }>(token(owner))?.sub;
  const memberId = app.jwt.decode<{ sub: string }>(token(member))?.sub;
  const outsiderId = app.jwt.decode<{ sub: string }>(token(outsider))?.sub;
  const inviteeId = app.jwt.decode<{ sub: string }>(token(invitee))?.sub;
  const outsiderHeaders = { authorization: `Bearer ${token(outsider)}` };
  assert.ok(ownerId); assert.ok(memberId); assert.ok(outsiderId); assert.ok(inviteeId);
  const ownerHeaders = { authorization: `Bearer ${token(owner)}` };
  const memberHeaders = { authorization: `Bearer ${token(member)}` };
  const workspaceId = (await app.inject({ method: "POST", url: "/workspace", headers: ownerHeaders, payload: { name: "채팅 관리 학교" } })).json().data as string;
  assert.equal((await app.inject({ method: "POST", url: "/chat/group/create", headers: ownerHeaders, payload: { workspaceId, name: "잘못된 초대", memberIds: [outsiderId] } })).statusCode, 403);
  store.workspaces.get(workspaceId)?.members.push(memberId, outsiderId, inviteeId);
  const roomId = (await app.inject({ method: "POST", url: "/chat/group/create", headers: ownerHeaders, payload: { workspaceId, name: "관리 테스트", memberIds: [memberId] } })).json().data as string;
  const searchResult = await app.inject({ url: `/chat/group/search?workspace=${workspaceId}&word=${encodeURIComponent("관리")}`, headers: ownerHeaders });
  assert.deepEqual(searchResult.json().data.map((room: { id: string }) => room.id), [roomId]);
  const noMatch = await app.inject({ url: `/chat/group/search?workspace=${workspaceId}&word=${encodeURIComponent("없는 방")}`, headers: ownerHeaders });
  assert.deepEqual(noMatch.json().data, []);

  assert.equal((await app.inject({ method: "POST", url: "/chat/group/member/add", headers: outsiderHeaders, payload: { roomId, memberIds: [inviteeId] } })).statusCode, 403);
  assert.equal((await app.inject({ method: "POST", url: "/chat/group/member/add", headers: memberHeaders, payload: { roomId, memberIds: [inviteeId] } })).statusCode, 200);
  assert.equal(store.rooms.get(roomId)?.memberIds.includes(inviteeId), true);
  assert.equal((await app.inject({ method: "POST", url: "/chat/group/member/add", headers: ownerHeaders, payload: { roomId, memberIds: ["00000000-0000-4000-8000-000000000000"] } })).statusCode, 403);
  assert.equal((await app.inject({ method: "PATCH", url: "/chat/group/member/toss", headers: memberHeaders, payload: { roomId, memberId: ownerId, memberIds: [] } })).statusCode, 403);
  assert.equal((await app.inject({ method: "PATCH", url: `/chat/group/left/${roomId}`, headers: outsiderHeaders })).statusCode, 404);

  assert.equal((await app.inject({ method: "PATCH", url: `/chat/group/left/${roomId}`, headers: ownerHeaders })).statusCode, 400);
  const room = store.rooms.get(roomId);
  assert.deepEqual(room?.memberIds, [ownerId, memberId, inviteeId]);
  assert.equal(room?.adminId, ownerId);
  assert.equal((await app.inject({ method: "PATCH", url: "/chat/group/member/toss", headers: ownerHeaders, payload: { roomId, memberId, memberIds: [] } })).statusCode, 200);
  assert.equal((await app.inject({ method: "PATCH", url: `/chat/group/left/${roomId}`, headers: ownerHeaders })).statusCode, 200);
  assert.deepEqual(room?.memberIds, [memberId, inviteeId]);
  assert.equal(room?.adminId, memberId);

  const singleRoomId = (await app.inject({ method: "POST", url: "/chat/group/create", headers: ownerHeaders, payload: { workspaceId, name: "마지막 구성원", memberIds: [] } })).json().data as string;
  assert.equal((await app.inject({ method: "PATCH", url: `/chat/group/left/${singleRoomId}`, headers: ownerHeaders })).statusCode, 200);
  assert.equal(store.rooms.get(singleRoomId)?.status, "DELETE");
  assert.deepEqual((await app.inject({ url: `/chat/group/search/${workspaceId}`, headers: memberHeaders })).json().data.map((item: { id: string }) => item.id), [roomId]);
  assert.equal((await app.inject({ url: `/chat/group/search/room/${singleRoomId}`, headers: ownerHeaders })).statusCode, 404);
  const personalRoomId = (await app.inject({ method: "POST", url: "/chat/personal/create", headers: ownerHeaders, payload: { workspaceId, name: "개인 대화", memberIds: [memberId] } })).json().data as string;
  assert.equal((await app.inject({ method: "PATCH", url: `/chat/group/left/${personalRoomId}`, headers: ownerHeaders })).statusCode, 400);
  await app.close();
});

test("persistent store survives a new application instance", async () => {
  const directory = mkdtempSync(join(tmpdir(), "seugi-api-"));
  try {
    const file = join(directory, "state.json");
    const firstStore = new Store(file); firstStore.emailCodes.set("persist@example.com", { code: "123456", expiresAt: Date.now() + 60_000 }); const first = await buildApp(firstStore);
    const registered = await first.inject({ method: "POST", url: "/member/register", payload: { email: "persist@example.com", password: "password123", code: "123456" } });
    const authorization = `Bearer ${registered.json().data.accessToken}`;
    const workspaceId = (await first.inject({ method: "POST", url: "/workspace", headers: { authorization }, payload: { name: "영속 학교" } })).json().data as string;
    await first.inject({ method: "PATCH", url: `/workspace/${workspaceId}/notifications`, headers: { authorization }, payload: { receivePush: false } });
    await first.close();
    const secondStore = new Store(file); secondStore.load(); assert.equal(secondStore.workspacePushPreferences.get(`${workspaceId}:${first.jwt.decode<{ sub: string }>(registered.json().data.accessToken)?.sub}`), false); const second = await buildApp(secondStore);
    const login = await second.inject({ method: "POST", url: "/member/login", payload: { email: "persist@example.com", password: "password123" } });
    const result = await second.inject({ method: "GET", url: "/workspace", headers: { authorization: `Bearer ${login.json().data.accessToken}` } });
    assert.equal(result.json().data[0].name, "영속 학교");
    await second.close();
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("mobile realtime client refreshes an expired access token before connecting", async () => {
  const store = new Store();
  store.emailCodes.set("realtime-refresh@example.com", { code: "123456", expiresAt: Date.now() + 60_000 });
  const app = await buildApp(store);
  attachRealtime(app, store);
  const registration = await app.inject({ method: "POST", url: "/member/register", payload: { email: "realtime-refresh@example.com", password: "password123", code: "123456" } });
  const tokens = registration.json().data as { accessToken: string; refreshToken: string };
  const memberId = app.jwt.decode<{ sub: string }>(tokens.accessToken)!.sub;
  const expiredAccessToken = app.jwt.sign({ sub: memberId, exp: Math.floor(Date.now() / 1000) - 1 });
  const apiUrl = await app.listen({ port: 0, host: "127.0.0.1" });
  const api = new SeugiApi(apiUrl, expiredAccessToken, tokens.refreshToken);
  const socket = createAuthenticatedSocket(api, apiUrl);
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Socket.IO reconnect timed out")), 3_000);
      socket.once("connect", () => { clearTimeout(timeout); resolve(); });
      socket.once("connect_error", (error) => {
        if (error.message !== "UNAUTHORIZED") { clearTimeout(timeout); reject(error); }
      });
    });
    assert.equal(socket.connected, true);
    assert.notEqual(api.accessToken(), expiredAccessToken);
  } finally {
    socket.close();
    await app.close();
  }
});

test("authenticated room members receive Socket.IO messages", async () => {
  const store = new Store(); const app = await buildApp(store); attachRealtime(app, store);
  const oldApiKey = process.env.OPENAI_API_KEY; const oldFetch = globalThis.fetch;
  store.emailCodes.set("chat@example.com", { code: "123456", expiresAt: Date.now() + 60_000 }); const registration = await app.inject({ method: "POST", url: "/member/register", payload: { email: "chat@example.com", password: "password123", code: "123456" } });
  const token = registration.json().data.accessToken as string; const headers = { authorization: `Bearer ${token}` };
  const workspaceResponse = await app.inject({ method: "POST", url: "/workspace", headers, payload: { name: "채팅 학교" } });
  const workspaceId = workspaceResponse.json().data as string;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  store.meals.set(workspaceId, [{ date: today, type: "중식", menu: ["김치볶음밥"] }]);
  const roomResponse = await app.inject({ method: "POST", url: "/chat/group/create", headers, payload: { workspaceId, name: "테스트 방", memberIds: [] } });
  const roomId = roomResponse.json().data as string;
  await app.listen({ port: 0, host: "127.0.0.1" });
  const address = app.server.address(); assert.ok(address && typeof address !== "string");
  const socket = io(`http://127.0.0.1:${address.port}`, { auth: { token }, transports: ["websocket"] });
  try {
    await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); });
    const memberRead = new Promise<{ roomId: string; userId: string; readAt: string }>((resolve) => socket.once("chat:member-read", resolve));
    const joinedRoom = await new Promise<boolean>((resolve) => socket.emit("room:join", roomId, resolve));
    assert.equal(joinedRoom, true);
    const readEvent = await memberRead;
    assert.equal(readEvent.roomId, roomId);
    assert.equal(readEvent.userId, app.jwt.decode<{ sub: string }>(token)?.sub);
    assert.ok(Date.parse(readEvent.readAt));
    const received = new Promise<{ message: string }>((resolve) => socket.once("chat:message", resolve));
    const acknowledged = await new Promise<{ message: string; data?: ChatMessage }>((resolve) => socket.emit("chat:message", { roomId, message: "안녕하세요" }, resolve));
    assert.equal(acknowledged.message, "메시지 전송 성공"); assert.equal((await received).message, "안녕하세요");
    const addedEmoji = new Promise<{ roomId: string; messageId: string; senderId: string; emoji: string; action: string }>((resolve) => socket.once("chat:message-emoji", resolve));
    await app.inject({ method: "PUT", url: "/message/emoji", headers, payload: { messageId: acknowledged.data?.id, emoji: "👍" } });
    assert.deepEqual(await addedEmoji, { roomId, messageId: acknowledged.data?.id, senderId: app.jwt.decode<{ sub: string }>(token)?.sub, emoji: "👍", action: "ADD" });
    const removedEmoji = new Promise<{ action: string }>((resolve) => socket.once("chat:message-emoji", resolve));
    await app.inject({ method: "DELETE", url: "/message/emoji", headers, payload: { messageId: acknowledged.data?.id, emoji: "👍" } });
    assert.equal((await removedEmoji).action, "REMOVE");
    const deletedEvent = new Promise<{ roomId: string; messageId: string }>((resolve) => socket.once("chat:message-deleted", resolve));
    const deleted = await app.inject({ method: "DELETE", url: "/message/delete", headers: { authorization: `Bearer ${token}` }, payload: { roomId, messageId: acknowledged.data?.id } });
    assert.equal(deleted.statusCode, 200); assert.deepEqual(await deletedEvent, { roomId, messageId: acknowledged.data?.id, senderId: app.jwt.decode<{ sub: string }>(token)?.sub });
    const fileMessage = await new Promise<{ message: string }>((resolve) => socket.emit("chat:message", { roomId, message: "", files: ["/uploads/demo.txt"] }, resolve));
    assert.equal(fileMessage.message, "메시지 전송 성공");
    const imageEvent = new Promise<ChatMessage>((resolve) => socket.once("chat:message", resolve));
    const imageMessage = await new Promise<{ message: string; data?: ChatMessage }>((resolve) => socket.emit("chat:message", { roomId, type: "IMG", message: "https://cdn.example.test/demo.jpg::demo.jpg" }, resolve));
    assert.equal(imageMessage.message, "메시지 전송 성공");
    assert.equal(imageMessage.data?.type, "IMG");
    assert.equal((await imageEvent).type, "IMG");
    const attachmentEvent = new Promise<ChatMessage>((resolve) => socket.once("chat:message", resolve));
    const attachmentMessage = await new Promise<{ message: string; data?: ChatMessage }>((resolve) => socket.emit("chat:message", { roomId, type: "FILE", message: "https://cdn.example.test/report.pdf::report.pdf::1024" }, resolve));
    assert.equal(attachmentMessage.message, "메시지 전송 성공");
    assert.equal(attachmentMessage.data?.type, "FILE");
    assert.equal((await attachmentEvent).type, "FILE");
    const history = await app.inject({ method: "GET", url: `/message/search/${roomId}`, headers });
    const historyMessages = history.json().data.messages as ChatMessage[];
    assert.equal(historyMessages.find((message) => message.id === imageMessage.data?.id)?.type, "IMG");
    assert.equal(historyMessages.find((message) => message.id === attachmentMessage.data?.id)?.type, "FILE");
    const emptyMessage = await new Promise<{ message: string }>((resolve) => socket.emit("chat:message", { roomId, message: "", files: [] }, resolve));
    assert.equal(emptyMessage.message, "MESSAGE_INVALID");
    process.env.OPENAI_API_KEY = "test-key";
    globalThis.fetch = (async () => new Response(JSON.stringify({ output: [{ type: "message", content: [{ type: "output_text", text: "안녕! 무엇을 도와드릴까요?" }] }] }), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;
    const botReply = new Promise<ChatMessage>((resolve, reject) => { const timer = setTimeout(() => reject(new Error("Catseugi reply timed out")), 2_000); socket.on("chat:message", (message: ChatMessage) => { if (message.type === "BOT") { clearTimeout(timer); resolve(message); } }); });
    const botRequest = await new Promise<{ message: string }>((resolve) => socket.emit("chat:message", { roomId, message: "스기야 안녕", mention: [-1] }, resolve));
    assert.equal(botRequest.message, "메시지 전송 성공");
    const reply = await botReply;
    assert.equal(reply.senderId, "-1"); assert.deepEqual(JSON.parse(reply.message), { keyword: "기타", data: "안녕! 무엇을 도와드릴까요?" });
    assert.ok([...store.messages.values()].some((message) => message.id === reply.id && message.type === "BOT"));
    const schoolBotReply = new Promise<ChatMessage>((resolve, reject) => { const timer = setTimeout(() => reject(new Error("Catseugi school-data reply timed out")), 2_000); socket.on("chat:message", (message: ChatMessage) => { if (message.type === "BOT" && message.message.includes("김치볶음밥")) { clearTimeout(timer); resolve(message); } }); });
    const schoolBotRequest = await new Promise<{ message: string }>((resolve) => socket.emit("chat:message", { roomId, message: "스기야 오늘 급식 뭐야?", mention: [-1] }, resolve));
    assert.equal(schoolBotRequest.message, "메시지 전송 성공");
    assert.match(JSON.parse((await schoolBotReply).message).data, /김치볶음밥/);
    const participantBotReply = new Promise<ChatMessage>((resolve, reject) => { const timer = setTimeout(() => reject(new Error("Catseugi participant reply timed out")), 2_000); socket.on("chat:message", (message: ChatMessage) => { if (message.type === "BOT" && message.message.includes("님이 뽑혔어요")) { clearTimeout(timer); resolve(message); } }); });
    const participantBotRequest = await new Promise<{ message: string }>((resolve) => socket.emit("chat:message", { roomId, message: "스기야 사람 한 명 뽑아줘", mention: [-1] }, resolve));
    assert.equal(participantBotRequest.message, "메시지 전송 성공");
    assert.match(JSON.parse((await participantBotReply).message).data, new RegExp(`${store.requireMember(app.jwt.decode<{ sub: string }>(token)!.sub).name}님이 뽑혔어요`));
    let receivedAfterLeaving = false;
    const afterLeaveListener = () => { receivedAfterLeaving = true; };
    socket.on("chat:message", afterLeaveListener);
    await new Promise<void>((resolve) => socket.emit("room:leave", roomId, resolve));
    const sentAfterLeaving = await new Promise<{ message: string }>((resolve) => socket.emit("chat:message", { roomId, message: "방을 나간 뒤" }, resolve));
    assert.equal(sentAfterLeaving.message, "메시지 전송 성공");
    await new Promise((resolve) => setTimeout(resolve, 50));
    socket.off("chat:message", afterLeaveListener);
    assert.equal(receivedAfterLeaving, false);
  } finally { if (oldApiKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldApiKey; globalThis.fetch = oldFetch; socket.close(); await app.close(); }
});

test("withdrawn members cannot reconnect to Socket.IO or legacy STOMP with an old token", async () => {
  const store = new Store(); const app = await buildApp(store); attachRealtime(app, store);
  const memberId = store.id(); store.members.set(memberId, { id: memberId, email: "deleted-realtime@example.com", name: "탈퇴 회원", deleted: true });
  const token = app.jwt.sign({ sub: memberId });
  await app.listen({ port: 0, host: "127.0.0.1" }); const address = app.server.address(); assert.ok(address && typeof address !== "string");
  const realtimeClient = io(`http://127.0.0.1:${address.port}`, { auth: { token }, transports: ["websocket"], reconnection: false });
  try {
    await new Promise<void>((resolve, reject) => { realtimeClient.once("connect", () => reject(new Error("withdrawn member unexpectedly connected to Socket.IO"))); realtimeClient.once("connect_error", () => resolve()); });
    const stompClient = new WebSocket(`ws://127.0.0.1:${address.port}/stomp/chat`);
    try {
      const frames: string[] = []; stompClient.on("message", (data) => frames.push(data.toString()));
      await new Promise<void>((resolve, reject) => { const timer = setTimeout(() => reject(new Error("STOMP websocket open timed out")), 2_000); stompClient.once("open", () => { clearTimeout(timer); resolve(); }); stompClient.once("error", (error) => { clearTimeout(timer); reject(error); }); });
      const rejected = new Promise<void>((resolve, reject) => { const timer = setTimeout(() => reject(new Error(`STOMP should reject withdrawn member: ${frames.join(" | ")}`)), 2_000); const interval = setInterval(() => { if (frames.some((frame) => frame.startsWith("ERROR\n") && frame.includes("UNAUTHORIZED"))) { clearInterval(interval); clearTimeout(timer); resolve(); } }, 5); });
      stompClient.send(`CONNECT\naccept-version:1.2\nAuthorization: Bearer ${token}\n\n\0`); await rejected;
    } finally { stompClient.close(); }
  } finally { realtimeClient.close(); await app.close(); }
});

test("chat room API accepts original Android/iOS request names and exposes legacy response fields", async () => {
  const store = new Store(); const ownerId = "00000000-0000-4000-8000-000000000011"; const peerId = "00000000-0000-4000-8000-000000000012"; const workspaceId = "00000000-0000-4000-8000-000000000013";
  store.members.set(ownerId, { id: ownerId, email: "owner@rooms.test", name: "방장" }); store.members.set(peerId, { id: peerId, email: "peer@rooms.test", name: "친구" });
  store.workspaces.set(workspaceId, { id: workspaceId, code: "ROOMTEST", name: "방 호환 학교", members: [ownerId, peerId], waitlist: [], ownerId });
  const app = await buildApp(store); const authorization = `Bearer ${app.jwt.sign({ sub: ownerId })}`;
  try {
    const created = await app.inject({ method: "POST", url: "/chat/personal/create", headers: { authorization }, payload: { workspaceId, roomName: "", joinUsers: [peerId], chatRoomImg: "" } });
    assert.equal(created.statusCode, 200); const roomId = created.json().data as string; const room = store.rooms.get(roomId); assert.equal(room?.name, "친구");
    const fetched = await app.inject({ method: "GET", url: `/chat/personal/search/room/${roomId}`, headers: { authorization } }); const data = fetched.json().data;
    assert.equal(data.chatName, "친구"); assert.equal(data.roomAdmin, ownerId); assert.equal(data.chatRoomImg, ""); assert.equal(data.joinUserInfo.length, 2); assert.equal(data.notReadCnt, 0);
    const repeated = await app.inject({ method: "POST", url: "/chat/personal/create", headers: { authorization }, payload: { workspaceId, roomName: "", joinUsers: [peerId], chatRoomImg: "" } });
    assert.equal(repeated.json().data, roomId);
    const invalid = await app.inject({ method: "POST", url: "/chat/personal/create", headers: { authorization }, payload: { workspaceId, roomName: "잘못된 개인방", joinUsers: [], chatRoomImg: "" } });
    assert.equal(invalid.statusCode, 400);
  } finally { await app.close(); }
});

test("chat room lists return the latest preview and unread count until a member subscribes", async () => {
  const store = new Store(); const ownerId = "00000000-0000-4000-8000-000000000021"; const peerId = "00000000-0000-4000-8000-000000000022"; const workspaceId = "00000000-0000-4000-8000-000000000023"; const roomId = "00000000-0000-4000-8000-000000000024";
  store.members.set(ownerId, { id: ownerId, email: "owner@preview.test", name: "방장" }); store.members.set(peerId, { id: peerId, email: "peer@preview.test", name: "친구" });
  store.workspaces.set(workspaceId, { id: workspaceId, code: "PREVIEW", name: "미리보기 학교", members: [ownerId, peerId], waitlist: [], ownerId });
  const createdAt = new Date(Date.now() - 30_000).toISOString(); const readAt = new Date(Date.now() - 20_000).toISOString(); const latestAt = new Date(Date.now() - 5_000).toISOString();
  store.rooms.set(roomId, { id: roomId, workspaceId, type: "GROUP", name: "최근 대화", memberIds: [ownerId, peerId], adminId: ownerId, createdAt, memberReadAt: { [ownerId]: readAt, [peerId]: readAt } });
  store.messages.set(store.id(), { id: store.id(), roomId, senderId: peerId, message: "사진 메시지", type: "IMG", createdAt: new Date(Date.now() - 10_000).toISOString(), emojis: {} });
  store.messages.set(store.id(), { id: store.id(), roomId, senderId: peerId, message: "마지막 메시지", type: "MESSAGE", createdAt: latestAt, emojis: {} });
  const app = await buildApp(store); const token = app.jwt.sign({ sub: ownerId }); const headers = { authorization: `Bearer ${token}` }; attachRealtime(app, store);
  await app.listen({ port: 0, host: "127.0.0.1" }); const address = app.server.address(); assert.ok(address && typeof address !== "string");
  const socket = io(`http://127.0.0.1:${address.port}`, { auth: { token }, transports: ["websocket"] });
  try {
    await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); });
    const list = await app.inject({ method: "GET", url: `/chat/group/search/${workspaceId}`, headers }); const room = list.json().data[0];
    assert.equal(room.lastMessage, "마지막 메시지"); assert.equal(room.lastMessageTimestamp, latestAt); assert.equal(room.notReadCnt, 2);
    socket.emit("room:join", roomId);
    await new Promise<void>((resolve, reject) => { const timeout = setTimeout(() => reject(new Error("room join did not advance member read timestamp")), 2_000); const interval = setInterval(() => { if ((store.rooms.get(roomId)?.memberReadAt?.[ownerId] ?? "") > latestAt) { clearInterval(interval); clearTimeout(timeout); resolve(); } }, 5); });
    const readList = await app.inject({ method: "GET", url: `/chat/group/search/${workspaceId}`, headers }); assert.equal(readList.json().data[0].notReadCnt, 0);
  } finally { socket.close(); await app.close(); }
});

test("original mobile clients can authenticate, subscribe, and send over STOMP", async () => {
  const store = new Store(); const app = await buildApp(store); attachRealtime(app, store);
  store.emailCodes.set("stomp@example.com", { code: "123456", expiresAt: Date.now() + 60_000 });
  const registration = await app.inject({ method: "POST", url: "/member/register", payload: { email: "stomp@example.com", password: "password123", code: "123456" } });
  const token = registration.json().data.accessToken as string; const headers = { authorization: `Bearer ${token}` };
  const workspaceId = (await app.inject({ method: "POST", url: "/workspace", headers, payload: { name: "STOMP 학교" } })).json().data as string;
  const roomId = (await app.inject({ method: "POST", url: "/chat/group/create", headers, payload: { workspaceId, name: "원본 클라이언트 방", memberIds: [] } })).json().data as string;
  await app.listen({ port: 0, host: "127.0.0.1" }); const address = app.server.address(); assert.ok(address && typeof address !== "string");
  const socket = new WebSocket(`ws://127.0.0.1:${address.port}/stomp/chat`);
  let migratedClient: ReturnType<typeof io> | undefined;
  try {
    const frames: string[] = []; socket.on("message", (data) => frames.push(data.toString()));
    await new Promise<void>((resolve, reject) => { const timer = setTimeout(() => reject(new Error("STOMP websocket open timed out")), 2_000); socket.once("open", () => { clearTimeout(timer); resolve(); }); socket.once("error", (error) => { clearTimeout(timer); reject(error); }); });
    const connected = new Promise<void>((resolve, reject) => { const timer = setInterval(() => { if (frames.some((frame) => frame.startsWith("CONNECTED\n"))) { clearInterval(timer); clearTimeout(timeout); resolve(); } }, 5); const timeout = setTimeout(() => { clearInterval(timer); reject(new Error(`STOMP CONNECT timed out: ${frames.join(" | ")}`)); }, 2_000); });
    socket.send(`CONNECT\naccept-version:1.2\nAuthorization: Bearer ${token}\n\n\0`); await connected;
    socket.send(`SUBSCRIBE\nid:sub-0\ndestination:/exchange/chat.exchange/room.${roomId}\n\n\0`);
    await new Promise((resolve) => setTimeout(resolve, 30));
    migratedClient = io(`http://127.0.0.1:${address.port}`, { auth: { token }, transports: ["websocket"] });
    await new Promise<void>((resolve, reject) => { migratedClient!.once("connect", resolve); migratedClient!.once("connect_error", reject); });
    migratedClient.emit("room:join", roomId);
    await new Promise((resolve) => setTimeout(resolve, 30));
    const socketMessage = new Promise<ChatMessage>((resolve) => migratedClient.once("chat:message", resolve));
    socket.send(`SEND\ndestination:/pub/chat.message\ncontent-type:application/json\n\n${JSON.stringify({ roomId, type: "MESSAGE", message: "구형 앱 호환", uuid: "client-uuid" })}\0`);
    await new Promise<void>((resolve, reject) => { const timer = setInterval(() => { const message = store.messages.values().next().value as ChatMessage | undefined; if (message) { clearInterval(timer); resolve(); } if (frames.some((frame) => frame.startsWith("ERROR\n"))) { clearInterval(timer); reject(new Error(frames.at(-1))); } }, 5); setTimeout(() => reject(new Error("STOMP message timed out")), 2_000); });
    const message = store.messages.values().next().value as ChatMessage; assert.equal(message.message, "구형 앱 호환");
    assert.ok(frames.some((frame) => frame.includes(`destination:/exchange/chat.exchange/room.${roomId}`) && frame.includes("구형 앱 호환")));
    assert.equal((await socketMessage).message, "구형 앱 호환");
    const migratedSend = new Promise<{ message: string }>((resolve) => migratedClient.emit("chat:message", { roomId, message: "Socket.IO 호환" }, resolve));
    assert.equal((await migratedSend).message, "메시지 전송 성공");
    await new Promise<void>((resolve, reject) => { const timer = setInterval(() => { if (frames.some((frame) => frame.includes("Socket.IO 호환"))) { clearInterval(timer); clearTimeout(timeout); resolve(); } }, 5); const timeout = setTimeout(() => { clearInterval(timer); reject(new Error("Socket.IO to STOMP message timed out")); }, 2_000); });
    await app.inject({ method: "PUT", url: "/message/emoji", headers: { authorization: `Bearer ${token}` }, payload: { messageId: message.id, emoji: "👍" } });
    await new Promise<void>((resolve, reject) => { const timer = setInterval(() => { if (frames.some((frame) => frame.includes("ADD_EMOJI") && frame.includes('"emojiId":1'))) { clearInterval(timer); clearTimeout(timeout); resolve(); } }, 5); const timeout = setTimeout(() => { clearInterval(timer); reject(new Error("STOMP emoji event timed out")); }, 2_000); });
    const deleted = await app.inject({ method: "DELETE", url: "/message/delete", headers: { authorization: `Bearer ${token}` }, payload: { roomId, messageId: message.id } }); assert.equal(deleted.statusCode, 200);
    await new Promise<void>((resolve, reject) => { const timer = setInterval(() => { if (frames.some((frame) => frame.includes("DELETE_MESSAGE") && frame.includes(message.id))) { clearInterval(timer); clearTimeout(timeout); resolve(); } }, 5); const timeout = setTimeout(() => { clearInterval(timer); reject(new Error(`STOMP deletion event timed out: ${frames.join(" | ")}`)); }, 2_000); });
  } finally { socket.close(); migratedClient?.close(); await app.close(); }
});

test("uploaded files are persisted and served back", async () => {
  const directory = mkdtempSync(join(tmpdir(), "seugi-upload-")); const previous = process.env.UPLOAD_DIR; process.env.UPLOAD_DIR = directory;
  const store = new Store(); const memberId = store.id(); store.members.set(memberId, { id: memberId, email: "upload@example.com", name: "업로드 사용자" });
  const app = await buildApp(store); const authorization = `Bearer ${app.jwt.sign({ sub: memberId })}`; await app.listen({ port: 0, host: "127.0.0.1" }); const address = app.server.address(); assert.ok(address && typeof address !== "string");
  try {
    const unauthorized = new FormData(); unauthorized.set("file", new Blob(["no token"], { type: "text/plain" }), "unauthorized.txt");
    assert.equal((await fetch(`http://127.0.0.1:${address.port}/file/upload/FILE`, { method: "POST", body: unauthorized })).status, 401);
    const form = new FormData(); form.set("file", new Blob(["seugi file"], { type: "text/plain" }), "hello.txt");
    const upload = await fetch(`http://127.0.0.1:${address.port}/file/upload/FILE`, { method: "POST", headers: { authorization }, body: form }); assert.equal(upload.status, 200);
    const uploadData = (await upload.json() as { data: { url: string; byte: number } }).data;
    assert.equal(uploadData.byte, "seugi file".length);
    const url = uploadData.url;
    assert.equal(await (await fetch(`http://127.0.0.1:${address.port}${url}`)).text(), "seugi file");
    const legacyForm = new FormData(); legacyForm.set("file", new Blob(["legacy image"], { type: "image/png" }), "school.png");
    const legacyUpload = await fetch(`http://127.0.0.1:${address.port}/file/upload/IMG`, { method: "POST", headers: { authorization }, body: legacyForm });
    assert.equal(legacyUpload.status, 200);
    const legacyData = (await legacyUpload.json() as { data: { url: string } }).data;
    assert.equal(await (await fetch(`http://127.0.0.1:${address.port}${legacyData.url}`)).text(), "legacy image");
    const workspace = await app.inject({ method: "POST", url: "/workspace", headers: { authorization }, payload: { name: "이미지 학교", image: legacyData.url } });
    assert.equal(workspace.statusCode, 200);
    assert.equal(store.workspaces.get(workspace.json().data)?.image, legacyData.url);
  } finally { await app.close(); if (previous === undefined) delete process.env.UPLOAD_DIR; else process.env.UPLOAD_DIR = previous; rmSync(directory, { recursive: true, force: true }); }
});
