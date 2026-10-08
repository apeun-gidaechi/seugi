import assert from "node:assert/strict";
import test from "node:test";
import { OAuthProvider } from "../src/oauth.js";

test("native Google server-auth-code exchange uses the original empty redirect URI", async () => {
  const savedClientId = process.env.GOOGLE_CLIENT_ID;
  const savedClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const savedFetch = globalThis.fetch;
  let redirectUri: string | null = null;
  process.env.GOOGLE_CLIENT_ID = "test-web-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-only-secret";
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    redirectUri = new URLSearchParams(String(init?.body ?? "")).get("redirect_uri");
    return new Response("{}", { status: 400 });
  }) as typeof fetch;
  try {
    await assert.rejects(
      new OAuthProvider().google("server-auth-code", "ANDROID"),
      /authorization code 교환에 실패/,
    );
    assert.equal(redirectUri, "");
  } finally {
    globalThis.fetch = savedFetch;
    if (savedClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = savedClientId;
    if (savedClientSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
    else process.env.GOOGLE_CLIENT_SECRET = savedClientSecret;
  }
});

test("native Apple authorization-code exchange uses the mobile client ID", async () => {
  const savedClientId = process.env.APPLE_MOBILE_CLIENT_ID;
  const savedClientSecret = process.env.APPLE_CLIENT_SECRET;
  const savedFetch = globalThis.fetch;
  let form: URLSearchParams | undefined;
  process.env.APPLE_MOBILE_CLIENT_ID = "com.seugi.app";
  process.env.APPLE_CLIENT_SECRET = "test-only-secret";
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    form = new URLSearchParams(String(init?.body ?? ""));
    return new Response("{}", { status: 400 });
  }) as typeof fetch;
  try {
    await assert.rejects(
      new OAuthProvider().apple("apple-auth-code", "IOS", "스기 사용자"),
      /Apple authorization code 교환에 실패/,
    );
    assert.equal(form?.get("client_id"), "com.seugi.app");
    assert.equal(form?.get("code"), "apple-auth-code");
    assert.equal(form?.get("grant_type"), "authorization_code");
  } finally {
    globalThis.fetch = savedFetch;
    if (savedClientId === undefined) delete process.env.APPLE_MOBILE_CLIENT_ID;
    else process.env.APPLE_MOBILE_CLIENT_ID = savedClientId;
    if (savedClientSecret === undefined) delete process.env.APPLE_CLIENT_SECRET;
    else process.env.APPLE_CLIENT_SECRET = savedClientSecret;
  }
});
