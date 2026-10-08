import { API_URL } from "../config";

export function absoluteApiUrl(url: string) {
  return /^https?:\/\//.test(url)
    ? url
    : `${API_URL.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
}
