import assert from "node:assert/strict";
import test from "node:test";
import { chatMessageInputSchema, legacyStompChatMessageSchema } from "@seugi/contracts";
import { acceptedChatMessageText } from "../src/chat-message.js";

test("chat payload validation returns whitespace-only text verbatim", () => {
  const message = "  keep these spaces  \n";
  assert.equal(acceptedChatMessageText(message), message);
});

test("chat payload validation rejects empty text without attachments", () => {
  assert.equal(acceptedChatMessageText(""), undefined);
  assert.equal(acceptedChatMessageText("", ["https://files.example/image.png"]), "");
});

test("shared Socket.IO message contract preserves non-empty whitespace and validates attachments", () => {
  const roomId = "f145a54c-8b50-4cf5-b816-e5442cd4b13f";
  assert.equal(chatMessageInputSchema.safeParse({ roomId, message: "  " }).success, true);
  assert.equal(chatMessageInputSchema.safeParse({ roomId, files: ["https://example.test/image.png"] }).success, true);
  assert.equal(chatMessageInputSchema.safeParse({ roomId, message: "", files: [] }).success, false);
  assert.equal(chatMessageInputSchema.safeParse({ roomId, message: "x", files: [""] }).success, false);
});

test("legacy STOMP contract retains original UUID, event and emoticon fields", () => {
  const result = legacyStompChatMessageSchema.safeParse({
    roomId: "f145a54c-8b50-4cf5-b816-e5442cd4b13f",
    message: "사진",
    type: "IMG",
    uuid: "client-uuid",
    eventList: [1, 2],
    emoticon: "seugi-smile",
    mention: [42],
    mentionAll: false,
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.uuid, "client-uuid");
    assert.deepEqual(result.data.eventList, [1, 2]);
    assert.equal(result.data.emoticon, "seugi-smile");
  }
});
