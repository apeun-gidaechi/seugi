import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";

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
