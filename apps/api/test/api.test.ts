import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildApp } from "../src/app.js";
import { Store } from "../src/store.js";

test("member can register, create a workspace, and retrieve it", async () => {
  const app = await buildApp();
  const registration = await app.inject({ method: "POST", url: "/member/register", payload: { email: "student@example.com", password: "password123", name: "학생" } });
  assert.equal(registration.statusCode, 200);
  const authorization = `Bearer ${registration.json().data.accessToken}`;
  const workspace = await app.inject({ method: "POST", url: "/workspace", headers: { authorization }, payload: { name: "스기고" } });
  assert.equal(workspace.statusCode, 200);
  const list = await app.inject({ method: "GET", url: "/workspace", headers: { authorization } });
  assert.equal(list.json().data.length, 1);
  await app.close();
});

test("persistent store survives a new application instance", async () => {
  const directory = mkdtempSync(join(tmpdir(), "seugi-api-"));
  try {
    const file = join(directory, "state.json");
    const firstStore = new Store(file); const first = await buildApp(firstStore);
    const registered = await first.inject({ method: "POST", url: "/member/register", payload: { email: "persist@example.com", password: "password123" } });
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
