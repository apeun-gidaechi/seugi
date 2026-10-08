import fs from "node:fs";
import dotenv from "dotenv";
import { renderFirebaseServiceWorkerEnvironment } from "./serviceWorkerEnv";

// The shared dotenv file is loaded here because Vite has not started yet.
dotenv.config({ path: "../../.env" });

fs.writeFileSync("./public/swEnv.js", renderFirebaseServiceWorkerEnvironment(process.env), "utf8");
