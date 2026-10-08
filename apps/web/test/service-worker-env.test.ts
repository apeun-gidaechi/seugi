import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { renderFirebaseServiceWorkerEnvironment } from "../src/serviceWorkerEnv.ts";

test("service worker Firebase config safely escapes environment values", () => {
  const source = renderFirebaseServiceWorkerEnvironment({
    VITE_FIREBASE_API_KEY: "key'; globalThis.pwned = true; //",
    VITE_FIREBASE_AUTH_DOMAIN: "seugi.example",
    VITE_FIREBASE_PROJECT_ID: "seugi",
    VITE_FIREBASE_STORAGE_BUCKET: "seugi.example",
    VITE_FIREBASE_MESSAGING_SENDER_ID: "123456",
    VITE_FIREBASE_APP_ID: "app-id",
    VITE_FIREBASE_MEASUREMENT_ID: "G-TEST",
  });

  const sandbox: Record<string, unknown> = {};
  const serviceWorkerEnvironment = vm.runInNewContext(`${source}\nswEnv`, sandbox) as Record<string, string>;
  assert.equal(sandbox.pwned, undefined);
  assert.equal(
    serviceWorkerEnvironment.VITE_FIREBASE_API_KEY,
    "key'; globalThis.pwned = true; //",
  );
});
