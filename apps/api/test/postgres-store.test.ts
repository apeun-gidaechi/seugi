import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";
import { buildApp } from "../src/app.js";
import { PostgresStore } from "../src/postgres-store.js";
import type { StoreSnapshot } from "../src/store.js";

type DatabaseRow = { revision: number; payload: StoreSnapshot };

class MemoryDatabase {
  row?: DatabaseRow;
  private lockQueue: Promise<void> = Promise.resolve();

  async lock() {
    const previous = this.lockQueue;
    let release!: () => void;
    this.lockQueue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    return release;
  }
}

class MemoryPool {
  constructor(private readonly database: MemoryDatabase) {}
  async query() {
    return { rows: [] };
  }
  async connect() {
    return new MemoryClient(this.database);
  }
  async end() {}
}

class MemoryClient {
  private releaseLock?: () => void;
  private stagedRow?: DatabaseRow;

  constructor(private readonly database: MemoryDatabase) {}

  async query(sql: string, values: unknown[] = []) {
    if (sql === "BEGIN") return { rows: [] };
    if (sql.startsWith("SELECT pg_advisory_xact_lock")) {
      this.releaseLock = await this.database.lock();
      return { rows: [] };
    }
    if (sql.startsWith("SELECT payload FROM seugi_state")) {
      const payload = this.database.row?.payload;
      return { rows: payload ? [{ payload: structuredClone(payload) }] : [] };
    }
    if (sql.startsWith("INSERT INTO seugi_state")) {
      this.stagedRow = { revision: 1, payload: JSON.parse(values[0] as string) as StoreSnapshot };
      return { rows: [] };
    }
    if (sql.startsWith("UPDATE seugi_state")) {
      if (!this.database.row) throw new Error("state row missing");
      this.stagedRow = {
        revision: this.database.row.revision + 1,
        payload: JSON.parse(values[0] as string) as StoreSnapshot,
      };
      return { rows: [] };
    }
    if (sql === "COMMIT") {
      if (this.stagedRow) this.database.row = structuredClone(this.stagedRow);
      this.releaseLock?.();
      this.releaseLock = undefined;
      this.stagedRow = undefined;
      return { rows: [] };
    }
    if (sql === "ROLLBACK") {
      this.releaseLock?.();
      this.releaseLock = undefined;
      this.stagedRow = undefined;
      return { rows: [] };
    }
    throw new Error(`Unexpected SQL in memory Postgres test: ${sql}`);
  }

  release() {
    this.releaseLock?.();
  }
}

const createStore = (database: MemoryDatabase) =>
  new PostgresStore(
    "postgres://memory-test",
    undefined,
    new MemoryPool(database) as unknown as Pool,
  );

test("PostgresStore serializes concurrent API writes and restores state after restart", async () => {
  const database = new MemoryDatabase();
  const firstStore = createStore(database);
  const secondStore = createStore(database);
  firstStore.emailCodes.set("postgres@example.com", {
    code: "123456",
    expiresAt: Date.now() + 60_000,
  });
  await firstStore.load();
  await secondStore.load();
  const firstApp = await buildApp(firstStore);
  const secondApp = await buildApp(secondStore);

  const registration = await firstApp.inject({
    method: "POST",
    url: "/member/register",
    payload: { email: "postgres@example.com", password: "password123", code: "123456" },
  });
  assert.equal(registration.statusCode, 200);
  const headers = { authorization: `Bearer ${registration.json().data.accessToken}` };

  const writes = await Promise.all([
    firstApp.inject({
      method: "POST",
      url: "/workspace",
      headers,
      payload: { name: "첫 번째 학교" },
    }),
    secondApp.inject({
      method: "POST",
      url: "/workspace",
      headers,
      payload: { name: "두 번째 학교" },
    }),
  ]);
  assert.deepEqual(
    writes.map((response) => response.statusCode),
    [200, 200],
  );

  const list = await firstApp.inject({ url: "/workspace", headers });
  assert.equal(list.statusCode, 200);
  assert.deepEqual(
    new Set(list.json().data.map((workspace: { name: string }) => workspace.name)),
    new Set(["첫 번째 학교", "두 번째 학교"]),
  );
  await Promise.all([firstApp.close(), secondApp.close()]);

  const restartedStore = createStore(database);
  await restartedStore.load();
  const restartedApp = await buildApp(restartedStore);
  const restored = await restartedApp.inject({ url: "/workspace", headers });
  assert.equal(restored.statusCode, 200);
  assert.equal(restored.json().data.length, 2);
  await restartedApp.close();
});
