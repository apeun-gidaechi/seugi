import assert from "node:assert/strict";
import test from "node:test";
import { redactRequestUrl } from "../src/logging.js";

test("request URL logs redact credentials and personal identifiers", () => {
  const url = redactRequestUrl(
    "/member/refresh?token=refresh-secret&email=user%40example.com&size=20",
  );

  assert.equal(url, "/member/refresh?token=%5BREDACTED%5D&email=%5BREDACTED%5D&size=20");
  assert.doesNotMatch(url, /refresh-secret|user%40example\.com/);
});

test("request URL logs preserve routes without query strings", () => {
  assert.equal(redactRequestUrl("/member/myInfo"), "/member/myInfo");
});
