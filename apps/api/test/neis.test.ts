import assert from "node:assert/strict";
import test from "node:test";
import { NeisClient } from "../src/neis.js";

const workspace = { id: "workspace", code: "CODE", name: "스기고", ownerId: "owner", members: [], waitlist: [], educationOfficeCode: "G10", schoolCode: "7010569" };

test("NEIS client converts meal rows into Seugi meal contracts", async () => {
  const client = new NeisClient("test-key", async () => new Response(JSON.stringify({ mealServiceDietInfo: [{}, { row: [{ MLSV_YMD: "20260102", MMEAL_SC_NM: "중식", DDISH_NM: "밥.1.2.<br/>국.3.", CAL_INFO: "500 Kcal" }] }] }))); 
  const meals = await client.meals(workspace, "20260101", "20260131");
  assert.deepEqual(meals, [{ date: "2026-01-02", type: "중식", menu: ["밥", "국"], calorie: "500 Kcal" }]);
});

test("NEIS client converts school schedule rows", async () => {
  const client = new NeisClient("test-key", async () => new Response(JSON.stringify({ SchoolSchedule: [{}, { row: [{ AA_YMD: "20260302", EVENT_NM: "개학식" }] }] }))); 
  assert.deepEqual(await client.schedules(workspace, 2026), [{ workspaceId: "workspace", date: "2026-03-02", name: "개학식" }]);
});
