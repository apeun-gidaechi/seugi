import assert from "node:assert/strict";
import test from "node:test";
import { notificationRecipientIds, PushNotifications } from "../src/push.js";

test("notice alerts match native recipient roles and exclude teachers and the author", () => {
  const workspace = { ownerId: "owner", members: ["owner", "middle", "student", "teacher", "author"] };
  const roles = new Map([
    ["owner", "ADMIN"],
    ["middle", "MIDDLE_ADMIN"],
    ["student", "STUDENT"],
    ["teacher", "TEACHER"],
    ["author", "TEACHER"],
  ] as const);

  assert.deepEqual(
    notificationRecipientIds(workspace, "author", (memberId) => roles.get(memberId)),
    ["owner", "middle", "student"],
  );
});

test("push adapter sends Expo tokens through the Expo gateway without Firebase credentials", async () => {
  const previous = process.env.FIREBASE_SERVICE_ACCOUNT_JSON; delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  let request: RequestInit | undefined;
  try {
    const push = new PushNotifications(async (_url, init) => { request = init; return new Response("{}", { status: 200 }); });
    await push.send(["ExpoPushToken[device]", "ExpoPushToken[device]", ""], { title: "공지", body: "새 공지입니다", imageUrl: "https://example.com/icon.png" });
    assert.equal((request?.headers as Record<string, string>).accept, "application/json");
    assert.deepEqual(JSON.parse(request?.body as string), [{ to: "ExpoPushToken[device]", title: "공지", body: "새 공지입니다", sound: "default", data: { imageUrl: "https://example.com/icon.png" } }]);
  } finally { if (previous !== undefined) process.env.FIREBASE_SERVICE_ACCOUNT_JSON = previous; }
});
