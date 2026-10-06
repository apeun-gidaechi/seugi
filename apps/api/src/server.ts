import { buildApp } from "./app.js";
import { attachRealtime } from "./realtime.js";
import { Store } from "./store.js";

const store = new Store();
const app = await buildApp(store);
attachRealtime(app, store);
await app.listen({ port: Number(process.env.PORT ?? 8080), host: process.env.HOST ?? "0.0.0.0" });
