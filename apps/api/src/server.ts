import { buildApp } from "./app.js";
import { attachRealtime } from "./realtime.js";
import { PostgresStore } from "./postgres-store.js";
import { SchoolDataResetScheduler } from "./school-data-scheduler.js";
import { Store } from "./store.js";

const legacyFilePath = process.env.DATA_FILE ?? "./data/seugi.json";
const store = process.env.DATABASE_URL
  ? new PostgresStore(process.env.DATABASE_URL, legacyFilePath)
  : new Store(legacyFilePath);
await store.load();
const app = await buildApp(store);
const schoolDataScheduler = new SchoolDataResetScheduler(store, (error, message) =>
  app.log.error(error, message),
);
app.addHook("onClose", async () => {
  schoolDataScheduler.stop();
  await store.close();
});
attachRealtime(app, store);
schoolDataScheduler.start();
await app.listen({ port: Number(process.env.PORT ?? 8080), host: process.env.HOST ?? "0.0.0.0" });
