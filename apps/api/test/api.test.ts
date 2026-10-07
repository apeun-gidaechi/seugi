import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { io } from "socket.io-client";
import WebSocket from "ws";
import type { ChatMessage } from "@seugi/contracts";
import { SeugiApi } from "../../../packages/api-client/src/index.js";
import { buildApp } from "../src/app.js";
import { attachRealtime } from "../src/realtime.js";
import { Store } from "../src/store.js";

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

test("member can register, create a workspace, and retrieve it", async () => {
  const store = new Store(); store.emailCodes.set("student@example.com", { code: "123456", expiresAt: Date.now() + 60_000 }); const app = await buildApp(store);
  const registration = await app.inject({ method: "POST", url: "/member/register", payload: { email: "student@example.com", password: "password123", name: "학생", code: "123456" } });
  assert.equal(registration.statusCode, 200);
  const authorization = `Bearer ${registration.json().data.accessToken}`;
  const workspace = await app.inject({ method: "POST", url: "/workspace", headers: { authorization }, payload: { name: "스기고" } });
  assert.equal(workspace.statusCode, 200);
  const task = await app.inject({ method: "POST", url: "/task", headers: { authorization }, payload: { workspaceId: workspace.json().data, title: "수학 과제", content: "2단원 문제 풀기", dueDate: "2026-10-15T00:00:00.000Z" } });
  assert.equal(task.statusCode, 200);
  const tasks = await app.inject({ method: "GET", url: `/task/${workspace.json().data}`, headers: { authorization } });
  assert.equal(tasks.json().data[0].title, "수학 과제");
  assert.equal(tasks.json().data[0].content, "2단원 문제 풀기");
  assert.equal(tasks.json().data[0].dueDate, "2026-10-15T00:00:00.000Z");
  const list = await app.inject({ method: "GET", url: "/workspace", headers: { authorization } });
  assert.equal(list.json().data.length, 1);
  await app.close();
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
  assert.equal((await app.inject({ url: `/workspace/search/${code}` })).statusCode, 401);
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
  assert.equal((await app.inject({ method: "DELETE", url: "/member/remove", headers })).statusCode, 200);
  assert.equal((await app.inject({ method: "GET", url: "/member/myInfo", headers })).statusCode, 404);
  assert.equal((await app.inject({ method: "GET", url: `/member/refresh?token=${encodeURIComponent(tokens.refreshToken)}` })).statusCode, 401);
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
  const notificationId = notification.json().data.id as string;
  assert.equal((await app.inject({ method: "PATCH", url: "/notification", headers: teacherHeaders, payload: { id: notificationId, workspaceId, title: "시험 일정", content: "다음 주 시험입니다" } })).statusCode, 200);
  assert.equal(store.notifications.get(notificationId)?.title, "시험 일정");
  assert.equal((await app.inject({ method: "DELETE", url: `/notification/${workspaceId}/${notificationId}`, headers: teacherHeaders })).statusCode, 200);
  assert.equal(store.notifications.has(notificationId), false);
  const roomId = (await app.inject({ method: "POST", url: "/chat/group/create", headers: ownerHeaders, payload: { workspaceId, name: "교사 방", memberIds: [teacherId] } })).json().data as string;
  assert.equal((await app.inject({ method: "PATCH", url: "/workspace/kick", headers: ownerHeaders, payload: { workspaceId, memberId: teacherId } })).statusCode, 200);
  assert.equal(store.rooms.get(roomId)?.memberIds.includes(teacherId), false);
  assert.equal((await app.inject({ method: "GET", url: `/chat/group/search/room/${roomId}`, headers: teacherHeaders })).statusCode, 404);
  await app.close();
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
  assert.equal((await app.inject({ method: "POST", url: "/workspace/join", headers: applicantHeaders, payload: { code } })).statusCode, 200);
  const applicantId = app.jwt.decode<{ sub: string }>(applicant.json().data.accessToken)?.sub; assert.ok(applicantId);
  const myRequests = await app.inject({ method: "GET", url: "/workspace/my/wait-list", headers: applicantHeaders });
  assert.equal(myRequests.json().data[0].workspaceId, workspaceId);
  assert.equal(myRequests.json().data[0].workspaceName, "가입 흐름 학교");
  assert.equal((await app.inject({ method: "DELETE", url: "/workspace/cancel", headers: applicantHeaders, payload: { workspaceId } })).statusCode, 200);
  assert.equal((await app.inject({ method: "GET", url: "/workspace/my/wait-list", headers: applicantHeaders })).json().data.length, 0);
  assert.equal((await app.inject({ method: "POST", url: "/workspace/join", headers: applicantHeaders, payload: { code } })).statusCode, 200);
  assert.equal((await app.inject({ method: "GET", url: `/workspace/wait-list?workspaceId=${workspaceId}&role=STUDENT`, headers: ownerHeaders })).json().data.length, 1);
  assert.equal((await app.inject({ method: "DELETE", url: "/workspace/cancel", headers: outsiderHeaders, payload: { workspaceId, userSet: [applicantId], role: "STUDENT" } })).statusCode, 403);
  assert.equal((await app.inject({ method: "DELETE", url: "/workspace/cancel", headers: ownerHeaders, payload: { workspaceId, userSet: [applicantId], role: "STUDENT" } })).statusCode, 200);
  assert.equal((await app.inject({ method: "GET", url: `/workspace/wait-list?workspaceId=${workspaceId}&role=STUDENT`, headers: ownerHeaders })).json().data.length, 0);
  assert.equal((await app.inject({ method: "POST", url: "/workspace/join", headers: applicantHeaders, payload: { code } })).statusCode, 200);
  assert.equal((await app.inject({ method: "PATCH", url: "/workspace/add", headers: ownerHeaders, payload: { workspaceId, memberId: applicantId, role: "STUDENT" } })).statusCode, 200);
  assert.equal(store.workspaces.get(workspaceId)?.members.includes(applicantId), true);
  await app.close();
});

test("workspace data rejects unauthenticated and non-member access with HTTP semantics", async () => {
  const store = new Store(); const app = await buildApp(store);
  for (const email of ["owner@example.com", "other@example.com"]) store.emailCodes.set(email, { code: "123456", expiresAt: Date.now() + 60_000 });
  const owner = await app.inject({ method: "POST", url: "/member/register", payload: { email: "owner@example.com", password: "password123", code: "123456" } });
  const other = await app.inject({ method: "POST", url: "/member/register", payload: { email: "other@example.com", password: "password123", code: "123456" } });
  const workspace = await app.inject({ method: "POST", url: "/workspace", headers: { authorization: `Bearer ${owner.json().data.accessToken}` }, payload: { name: "권한 학교" } });
  const ownerId = app.jwt.decode<{ sub: string }>(owner.json().data.accessToken)?.sub; assert.ok(ownerId);
  const otherId = app.jwt.decode<{ sub: string }>(other.json().data.accessToken)?.sub; assert.ok(otherId);
  const workspaceUrl = `/workspace/${workspace.json().data}/notifications`;
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

test("group room administration enforces membership and transfers leadership safely", async () => {
  const store = new Store(); const app = await buildApp(store);
  const emails = ["room-admin@example.com", "room-member@example.com", "room-outsider@example.com"];
  for (const email of emails) store.emailCodes.set(email, { code: "123456", expiresAt: Date.now() + 60_000 });
  const register = async (email: string) => app.inject({ method: "POST", url: "/member/register", payload: { email, password: "password123", code: "123456" } });
  const [owner, member, outsider] = await Promise.all(emails.map(register));
  const token = (response: typeof owner) => response.json().data.accessToken as string;
  const ownerId = app.jwt.decode<{ sub: string }>(token(owner))?.sub;
  const memberId = app.jwt.decode<{ sub: string }>(token(member))?.sub;
  const outsiderHeaders = { authorization: `Bearer ${token(outsider)}` };
  assert.ok(ownerId); assert.ok(memberId);
  const ownerHeaders = { authorization: `Bearer ${token(owner)}` };
  const memberHeaders = { authorization: `Bearer ${token(member)}` };
  const workspaceId = (await app.inject({ method: "POST", url: "/workspace", headers: ownerHeaders, payload: { name: "채팅 관리 학교" } })).json().data as string;
  store.workspaces.get(workspaceId)?.members.push(memberId);
  const outsiderId = app.jwt.decode<{ sub: string }>(token(outsider))?.sub; assert.ok(outsiderId);
  assert.equal((await app.inject({ method: "POST", url: "/chat/group/create", headers: ownerHeaders, payload: { workspaceId, name: "잘못된 초대", memberIds: [outsiderId] } })).statusCode, 403);
  const roomId = (await app.inject({ method: "POST", url: "/chat/group/create", headers: ownerHeaders, payload: { workspaceId, name: "관리 테스트", memberIds: [memberId] } })).json().data as string;
  const searchResult = await app.inject({ url: `/chat/group/search?workspace=${workspaceId}&word=${encodeURIComponent("관리")}`, headers: ownerHeaders });
  assert.deepEqual(searchResult.json().data.map((room: { id: string }) => room.id), [roomId]);
  const noMatch = await app.inject({ url: `/chat/group/search?workspace=${workspaceId}&word=${encodeURIComponent("없는 방")}`, headers: ownerHeaders });
  assert.deepEqual(noMatch.json().data, []);

  assert.equal((await app.inject({ method: "POST", url: "/chat/group/member/add", headers: outsiderHeaders, payload: { roomId, memberIds: [memberId] } })).statusCode, 403);
  assert.equal((await app.inject({ method: "POST", url: "/chat/group/member/add", headers: ownerHeaders, payload: { roomId, memberIds: ["00000000-0000-4000-8000-000000000000"] } })).statusCode, 403);
  assert.equal((await app.inject({ method: "PATCH", url: "/chat/group/member/toss", headers: memberHeaders, payload: { roomId, memberId: ownerId, memberIds: [] } })).statusCode, 403);
  assert.equal((await app.inject({ method: "PATCH", url: `/chat/group/left/${roomId}`, headers: outsiderHeaders })).statusCode, 404);

  assert.equal((await app.inject({ method: "PATCH", url: `/chat/group/left/${roomId}`, headers: ownerHeaders })).statusCode, 200);
  const room = store.rooms.get(roomId);
  assert.deepEqual(room?.memberIds, [memberId]);
  assert.equal(room?.adminId, memberId);
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

test("authenticated room members receive Socket.IO messages", async () => {
  const store = new Store(); const app = await buildApp(store); attachRealtime(app, store);
  store.emailCodes.set("chat@example.com", { code: "123456", expiresAt: Date.now() + 60_000 }); const registration = await app.inject({ method: "POST", url: "/member/register", payload: { email: "chat@example.com", password: "password123", code: "123456" } });
  const token = registration.json().data.accessToken as string; const headers = { authorization: `Bearer ${token}` };
  const workspaceResponse = await app.inject({ method: "POST", url: "/workspace", headers, payload: { name: "채팅 학교" } });
  const workspaceId = workspaceResponse.json().data as string;
  const roomResponse = await app.inject({ method: "POST", url: "/chat/group/create", headers, payload: { workspaceId, name: "테스트 방", memberIds: [] } });
  const roomId = roomResponse.json().data as string;
  await app.listen({ port: 0, host: "127.0.0.1" });
  const address = app.server.address(); assert.ok(address && typeof address !== "string");
  const socket = io(`http://127.0.0.1:${address.port}`, { auth: { token }, transports: ["websocket"] });
  try {
    await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); });
    socket.emit("room:join", roomId);
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
    const emptyMessage = await new Promise<{ message: string }>((resolve) => socket.emit("chat:message", { roomId, message: "", files: [] }, resolve));
    assert.equal(emptyMessage.message, "MESSAGE_INVALID");
  } finally { socket.close(); await app.close(); }
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
