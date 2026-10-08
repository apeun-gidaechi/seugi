import assert from "node:assert/strict";
import test from "node:test";
import { API_SPEC } from "@seugi/contracts";
import { buildApp } from "../src/app.js";
import { Store } from "../src/store.js";

test("every shared API contract is registered by the Fastify server", async () => {
  const app = await buildApp(new Store());
  try {
    await app.ready();
    for (const [name, route] of Object.entries(API_SPEC)) {
      assert.ok(
        app.hasRoute({ method: route.method, url: route.path }),
        `API_SPEC.${name} (${route.method} ${route.path}) is not registered`,
      );
    }
  } finally {
    await app.close();
  }
});
