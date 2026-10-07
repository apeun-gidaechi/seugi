import { SeugiApi } from "@seugi/api-client";
import Cookies from "js-cookie";

const SERVER_URL = import.meta.env.VITE_SERVER_URL as string;
const tokenValue = (token?: string) => token?.replace(/^Bearer\s+/i, "");

export async function withSeugiApi<T>(operation: (api: SeugiApi) => Promise<{ data?: T }>): Promise<T> {
  const initialToken = tokenValue(Cookies.get("accessToken"));
  const api = new SeugiApi(SERVER_URL, initialToken, tokenValue(Cookies.get("refreshToken")));
  try {
    return (await operation(api)).data as T;
  } finally {
    const refreshedToken = api.accessToken();
    if (refreshedToken && refreshedToken !== initialToken) {
      Cookies.set("accessToken", refreshedToken);
    }
  }
}

export async function withPublicSeugiApi<T>(operation: (api: SeugiApi) => Promise<{ data?: T }>): Promise<T> {
  const api = new SeugiApi(SERVER_URL);
  return (await operation(api)).data as T;
}
