import assert from "node:assert/strict";
import test from "node:test";
import { workspaceMemberProfileHeader, workspaceMemberProfileRows } from "../src/utils/workspaceMemberProfile.ts";

const profile = { name: "민지", nick: "민", status: "", spot: "교사", belong: "", phone: "010", wire: "", location: "2층" };

test("iOS member profile sheet includes nickname and uses dashes for blank native profile cells", () => {
  assert.equal(workspaceMemberProfileHeader("ios", profile), "민지 (민)");
  assert.deepEqual(workspaceMemberProfileRows("ios", profile), [
    { label: "상태메세지", value: "-" },
    { label: "닉네임", value: "민" },
    { label: "직위", value: "교사" },
    { label: "소속", value: "-" },
    { label: "휴대전화번호", value: "010" },
    { label: "유선전화번호", value: "-" },
    { label: "근무위치", value: "2층" },
  ]);
});

test("Android member profile sheet omits nickname and student number, retaining blank rows", () => {
  assert.equal(workspaceMemberProfileHeader("android", profile), "민지");
  assert.deepEqual(workspaceMemberProfileRows("android", profile), [
    { label: "상태메세지", value: "" },
    { label: "직위", value: "교사" },
    { label: "소속", value: "" },
    { label: "휴대전화번호", value: "010" },
    { label: "유선전화번호", value: "" },
    { label: "근무위치", value: "2층" },
  ]);
});
