import { path, query, route, segment } from "./helpers.js";

export const integrationApiSpec = {
  sendVerification: query("GET", "/email/send", (email: string) => `/email/send?email=${segment(email)}`),
  confirmVerification: route("POST", "/email/confirm"),
  authenticateOAuth: path("POST", "/oauth/:provider/authenticate", (provider: string) => `/oauth/${segment(provider)}/authenticate`),
  connectGoogle: route("POST", "/oauth/google/connect"),
  removeGoogleConnection: route("DELETE", "/oauth/google/remove"),
  googleConnection: route("GET", "/oauth/google/status"),
  askCatseugi: route("POST", "/ai"),
  uploadFile: path("POST", "/file/upload/:type", (type: string) => `/file/upload/${segment(type)}`),
} as const;
