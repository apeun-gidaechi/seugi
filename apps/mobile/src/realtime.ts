import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@seugi/contracts";
import type { SeugiApi } from "@seugi/api-client";

type SeugiSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createAuthenticatedSocket(
  api: SeugiApi,
  apiUrl: string,
  onAuthenticationFailure: () => void = () => undefined,
): SeugiSocket {
  const socket = io(apiUrl, { auth: { token: api.accessToken() }, timeout: 15000 }) as SeugiSocket;
  let refreshAttempted = false;

  socket.on("connect", () => {
    refreshAttempted = false;
  });
  socket.on("connect_error", (error) => {
    if (error.message !== "UNAUTHORIZED") return;
    if (refreshAttempted) {
      onAuthenticationFailure();
      return;
    }
    refreshAttempted = true;
    void api
      .memberInfo()
      .then(() => {
        const token = api.accessToken();
        if (!token) throw new Error("ACCESS_TOKEN_REFRESH_FAILED");
        socket.auth = { token };
        socket.connect();
      })
      .catch(onAuthenticationFailure);
  });

  return socket;
}
