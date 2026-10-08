import assert from "node:assert/strict";
import test from "node:test";
import { workspaceMemberDisplayName } from "../src/utils/member.ts";

test("workspace member display name follows native nameAndNick", () => {
  assert.equal(workspaceMemberDisplayName({ name: "홍길동", nick: "" }), "홍길동");
  assert.equal(workspaceMemberDisplayName({ name: "홍길동", nick: "길동" }), "홍길동 (길동)");
});
