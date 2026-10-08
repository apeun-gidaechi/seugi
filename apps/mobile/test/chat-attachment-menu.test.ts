import assert from "node:assert/strict";
import test from "node:test";
import { chatAttachmentMenuItems } from "../src/utils/chatAttachmentMenu.ts";

test("Android attachment popup follows native file-then-image order and copy", () => {
  assert.deepEqual(chatAttachmentMenuItems("android"), [
    { action: "file", label: "파일 업로드" },
    { action: "image", label: "이미지 업로드" },
  ]);
});

test("iOS attachment menu follows native image-then-file order and copy", () => {
  assert.deepEqual(chatAttachmentMenuItems("ios"), [
    { action: "image", label: "이미지" },
    { action: "file", label: "파일" },
  ]);
});
