import assert from "node:assert/strict";
import test from "node:test";
import type { WorkspaceMemberView } from "@seugi/contracts";
import { workspaceMemberProfileModel } from "../src/utils/workspaceMemberProfileModel.ts";

test("workspace member list rows contain enough profile data to open the native detail sheet without another request", () => {
  const member = {
    workspaceId: "workspace-1",
    id: "member-1",
    email: "member@example.com",
    name: "민지",
    picture: "https://example.com/avatar.png",
    role: "TEACHER",
    permission: "TEACHER",
    status: "안녕하세요",
    nick: "민",
    spot: "담임",
    belong: "1학년",
    phone: "010-0000-0000",
    wire: "02-0000-0000",
    location: "2층",
    member: {
      id: "member-1",
      email: "member@example.com",
      name: "민지",
      nick: "민",
      picture: "https://example.com/avatar.png",
      permission: "TEACHER",
      spot: "담임",
      belong: "1학년",
      phone: "010-0000-0000",
      wire: "02-0000-0000",
      location: "2층",
    },
  } as unknown as WorkspaceMemberView;

  const profile = workspaceMemberProfileModel(member);
  assert.equal(profile.member.id, "member-1");
  assert.equal(profile.member.birth, "");
  assert.equal(profile.name, "민지");
  assert.equal(profile.nick, "민");
  assert.equal(profile.permission, "TEACHER");
  assert.equal(profile.phone, "010-0000-0000");
});
