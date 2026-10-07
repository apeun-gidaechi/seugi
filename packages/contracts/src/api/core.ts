import { path, route, segment } from "./helpers.js";

export const coreApiSpec = {
  health: route("GET", "/health"),
  uploadedFile: path("GET", "/uploads/:name", (name: string) => `/uploads/${segment(name)}`),
} as const;
