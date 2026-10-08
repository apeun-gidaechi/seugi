import assert from "node:assert/strict";
import test from "node:test";
import { NeisClient } from "../src/neis.js";

const workspace = {
  id: "workspace",
  code: "CODE",
  name: "스기고",
  ownerId: "owner",
  members: [],
  waitlist: [],
  educationOfficeCode: "G10",
  schoolCode: "7010569",
};

test("NEIS school info resolves the workspace identifiers used by meals and timetables", async () => {
  let requested = "";
  const client = new NeisClient("test-key", async (input) => {
    requested = String(input);
    return new Response(
      JSON.stringify({
        schoolInfo: [
          {},
          {
            row: [
              { ATPT_OFCDC_SC_CODE: "G10", SD_SCHUL_CODE: "7010569", SCHUL_KND_SC_NM: "고등학교" },
            ],
          },
        ],
      }),
    );
  });
  assert.deepEqual(await client.schoolInfo("스기고"), {
    educationOfficeCode: "G10",
    schoolCode: "7010569",
    schoolType: "고등학교",
  });
  const url = new URL(requested);
  assert.equal(url.pathname, "/hub/schoolInfo");
  assert.equal(url.searchParams.get("SCHUL_NM"), "스기고");
});

test("NEIS school info preserves the native unknown-school fallback when unavailable", async () => {
  const client = new NeisClient("");
  assert.deepEqual(await client.schoolInfo("없는 학교"), {
    educationOfficeCode: "x",
    schoolCode: "x",
    schoolType: "기타",
  });
});

test("NEIS client converts meal rows into Seugi meal contracts", async () => {
  const client = new NeisClient(
    "test-key",
    async () =>
      new Response(
        JSON.stringify({
          mealServiceDietInfo: [
            {},
            {
              row: [
                {
                  MLSV_YMD: "20260102",
                  MMEAL_SC_NM: "중식",
                  DDISH_NM: "밥.1.2.<br/>국.3.",
                  CAL_INFO: "500 Kcal",
                },
              ],
            },
          ],
        }),
      ),
  );
  const meals = await client.meals(workspace, "20260101", "20260131");
  assert.deepEqual(meals, [
    { date: "2026-01-02", type: "중식", menu: ["밥", "국"], calorie: "500 Kcal" },
  ]);
});

test("NEIS client converts school schedule rows", async () => {
  const client = new NeisClient(
    "test-key",
    async () =>
      new Response(
        JSON.stringify({
          SchoolSchedule: [{}, { row: [{ AA_YMD: "20260302", EVENT_NM: "개학식" }] }],
        }),
      ),
  );
  assert.deepEqual(await client.schedules(workspace, 2026), [
    { workspaceId: "workspace", date: "2026-03-02", name: "개학식" },
  ]);
});

test("NEIS client loads timetable rows from the school-type-specific endpoint", async () => {
  let requested = "";
  const client = new NeisClient("test-key", async (input) => {
    requested = String(input);
    return new Response(
      JSON.stringify({
        hisTimetable: [
          {},
          {
            row: [
              { GRADE: "2", CLASS_NM: "3", PERIO: "1", ITRT_CNTNT: "수학", ALL_TI_YMD: "20261007" },
            ],
          },
        ],
      }),
    );
  });
  const timetable = await client.timetables(
    { ...workspace, schoolType: "HIGH" },
    "20261005",
    "20261011",
  );
  assert.equal(new URL(requested).pathname, "/hub/hisTimetable");
  assert.deepEqual(timetable, [
    {
      id: "",
      workspaceId: "workspace",
      grade: "2",
      classNum: "3",
      time: "1",
      subject: "수학",
      date: "2026-10-07",
    },
  ]);
});
