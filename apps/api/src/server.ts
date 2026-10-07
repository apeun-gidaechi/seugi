import { buildApp } from "./app.js";
import { attachRealtime } from "./realtime.js";
import { PostgresStore } from "./postgres-store.js";
import { Store } from "./store.js";

const legacyFilePath = process.env.DATA_FILE ?? "./data/seugi.json";
const store = process.env.DATABASE_URL ? new PostgresStore(process.env.DATABASE_URL, legacyFilePath) : new Store(legacyFilePath);
await store.load();
const app = await buildApp(store);
app.addHook("onClose", async () => { await store.close(); });
attachRealtime(app, store);
await app.listen({ port: Number(process.env.PORT ?? 8080), host: process.env.HOST ?? "0.0.0.0" });
