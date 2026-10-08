import { Pool, type PoolClient } from "pg";
import { Store, type StoreSnapshot } from "./store.js";

const advisoryLockId = "710269023001";

/**
 * Shared PostgreSQL persistence for the existing in-memory domain model.
 * Requests take a transaction-scoped advisory lock, refresh the snapshot,
 * execute the existing handler, then atomically write the resulting snapshot.
 * This preserves correctness across API replicas while a normalized repository
 * migration is still pending; the global lock intentionally trades throughput
 * for simple, lossless cross-instance semantics.
 */
export class PostgresStore extends Store {
  private readonly pool: Pool;
  private activeRequest?: PoolClient;
  private localGate: Promise<void> = Promise.resolve();
  private activeRelease?: () => void;

  constructor(connectionString: string, legacyFilePath?: string, pool?: Pool) {
    super(legacyFilePath);
    this.pool = pool ?? new Pool({ connectionString, max: 20, application_name: "seugi-api" });
  }

  async load() {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS seugi_state (
      id SMALLINT PRIMARY KEY CHECK (id = 1),
      revision BIGINT NOT NULL DEFAULT 0,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [advisoryLockId]);
      const { rows } = await client.query<{ payload: StoreSnapshot }>(
        "SELECT payload FROM seugi_state WHERE id = 1",
      );
      if (rows[0]) this.restore(rows[0].payload);
      else {
        super.load();
        await client.query(
          "INSERT INTO seugi_state (id, revision, payload) VALUES (1, 1, $1::jsonb)",
          [JSON.stringify(this.snapshot())],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async beginRequest() {
    const releaseLocal = await this.acquireLocalGate();
    let client: PoolClient | undefined;
    try {
      client = await this.pool.connect();
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [advisoryLockId]);
      const { rows } = await client.query<{ payload: StoreSnapshot }>(
        "SELECT payload FROM seugi_state WHERE id = 1",
      );
      if (rows[0]) this.restore(rows[0].payload);
      this.activeRequest = client;
      this.activeRelease = releaseLocal;
    } catch (error) {
      if (client) {
        await client.query("ROLLBACK").catch(() => undefined);
        client.release();
      }
      releaseLocal();
      throw error;
    }
  }

  async persist() {
    const client = this.activeRequest;
    if (!client) return;
    try {
      await client.query(
        "UPDATE seugi_state SET revision = revision + 1, payload = $1::jsonb, updated_at = NOW() WHERE id = 1",
        [JSON.stringify(this.snapshot())],
      );
      await client.query("COMMIT");
      this.flushMessageDeletedEvents();
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      this.discardMessageDeletedEvents();
      throw error;
    } finally {
      this.activeRequest = undefined;
      client.release();
      this.activeRelease?.();
      this.activeRelease = undefined;
    }
  }

  async rollbackRequest() {
    const client = this.activeRequest;
    if (!client) return;
    this.activeRequest = undefined;
    await client.query("ROLLBACK").catch(() => undefined);
    this.discardMessageDeletedEvents();
    client.release();
    this.activeRelease?.();
    this.activeRelease = undefined;
  }

  async withMutation<T>(operation: () => Promise<T> | T): Promise<T> {
    await this.beginRequest();
    try {
      const result = await operation();
      await this.persist();
      return result;
    } catch (error) {
      await this.rollbackRequest();
      throw error;
    }
  }

  async close() {
    await this.rollbackRequest();
    await this.pool.end();
  }

  private async acquireLocalGate() {
    const previous = this.localGate;
    let release!: () => void;
    this.localGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    return release;
  }
}
