import assert from "node:assert/strict";
import test from "node:test";
import { fetchClassroomTasks } from "../src/classroom.js";

test("Google Classroom adapter collects coursework across active courses", async () => {
  const seen: string[] = [];
  const fetcher = async (input: string | URL | Request) => { const url = String(input); seen.push(url); if (url.includes("courses?")) return new Response(JSON.stringify({ courses: [{ id: "course-a" }, { id: "course-b" }] })); return new Response(JSON.stringify({ courseWork: [{ id: url.endsWith("course-a/courseWork") ? "a" : "b", title: "과제", dueDate: { year: 2026, month: 3, day: 1 }, dueTime: { hours: 9, minutes: 30 } }] })); };
  const tasks = await fetchClassroomTasks({ accessToken: "token" }, fetcher as typeof fetch);
  assert.equal(tasks.length, 2); assert.match(tasks[0].dueDate ?? "", /^2026-03-01T/); assert.equal(seen.length, 3);
});
