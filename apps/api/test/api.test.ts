import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { io } from "socket.io-client";
import { buildApp } from "../src/app.js";
import { attachRealtime } from "../src/realtime.js";
import { Store } from "../src/store.js";

test("member can register, create a workspace, and retrieve it", async () => {
  const store = new Store(); store.emailCodes.set("student@example.com", { code: "123456", expiresAt: Date.now() + 60_000 }); const app = await buildApp(store);
  const registration = await app.inject({ method: "POST", url: "/member/register", payload: { email: "student@example.com", password: "password123", name: "학생", code: "123456" } });
  assert.equal(registration.statusCode, 200);
  const authorization = `Bearer ${registration.json().data.accessToken}`;
  const workspace = await app.inject({ method: "POST", url: "/workspace", headers: { authorization }, payload: { name: "스기고" } });
  assert.equal(workspace.statusCode, 200);
  const task = await app.inject({ method: "POST", url: "/task", headers: { authorization }, payload: { workspaceId: workspace.json().data, title: "수학 과제" } });
  assert.equal(task.statusCode, 200);
  const tasks = await app.inject({ method: "GET", url: `/task/${workspace.json().data}`, headers: { authorization } });
  assert.equal(tasks.json().data[0].title, "수학 과제");
  const list = await app.inject({ method: "GET", url: "/workspace", headers: { authorization } });
  assert.equal(list.json().data.length, 1);
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

test("persistent store survives a new application instance", async () => {
  const directory = mkdtempSync(join(tmpdir(), "seugi-api-"));
  try {
    const file = join(directory, "state.json");
    const firstStore = new Store(file); firstStore.emailCodes.set("persist@example.com", { code: "123456", expiresAt: Date.now() + 60_000 }); const first = await buildApp(firstStore);
    const registered = await first.inject({ method: "POST", url: "/member/register", payload: { email: "persist@example.com", password: "password123", code: "123456" } });
    const authorization = `Bearer ${registered.json().data.accessToken}`;
    await first.inject({ method: "POST", url: "/workspace", headers: { authorization }, payload: { name: "영속 학교" } });
    await first.close();
    const secondStore = new Store(file); secondStore.load(); const second = await buildApp(secondStore);
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
    const acknowledged = await new Promise<{ message: string }>((resolve) => socket.emit("chat:message", { roomId, message: "안녕하세요" }, resolve));
    assert.equal(acknowledged.message, "메시지 전송 성공"); assert.equal((await received).message, "안녕하세요");
  } finally { socket.close(); await app.close(); }
});

test("uploaded files are persisted and served back", async () => {
  const directory = mkdtempSync(join(tmpdir(), "seugi-upload-")); const previous = process.env.UPLOAD_DIR; process.env.UPLOAD_DIR = directory;
  const app = await buildApp(); await app.listen({ port: 0, host: "127.0.0.1" }); const address = app.server.address(); assert.ok(address && typeof address !== "string");
  try {
    const form = new FormData(); form.set("file", new Blob(["seugi file"], { type: "text/plain" }), "hello.txt");
    const upload = await fetch(`http://127.0.0.1:${address.port}/file/upload/FILE`, { method: "POST", body: form }); assert.equal(upload.status, 200);
    const url = (await upload.json() as { data: { url: string } }).data.url;
    assert.equal(await (await fetch(`http://127.0.0.1:${address.port}${url}`)).text(), "seugi file");
  } finally { await app.close(); if (previous === undefined) delete process.env.UPLOAD_DIR; else process.env.UPLOAD_DIR = previous; rmSync(directory, { recursive: true, force: true }); }
});
