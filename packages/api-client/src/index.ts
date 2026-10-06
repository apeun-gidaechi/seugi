import type { ApiResponse, ChatMessage, Notification, Room, Task, Timetable, Tokens, Workspace } from "@seugi/contracts";

export class SeugiApi {
  constructor(readonly baseUrl: string, private token?: string) {}
  setToken(token?: string) { this.token = token; }
  accessToken() { return this.token; }
  private async request<T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}${path}`, { ...init, headers: { "content-type": "application/json", ...(this.token ? { authorization: `Bearer ${this.token}` } : {}), ...init.headers } });
    const payload = await response.json() as ApiResponse<T>;
    if (!response.ok) throw new Error(payload.message);
    return payload;
  }
  sendVerification(email: string) { return this.request<void>(`/email/send?email=${encodeURIComponent(email)}`); }
  register(input: { email: string; password: string; name?: string; code: string }) { return this.request<Tokens>("/member/register", { method: "POST", body: JSON.stringify(input) }); }
  login(input: { email: string; password: string }) { return this.request<Tokens>("/member/login", { method: "POST", body: JSON.stringify(input) }); }
  registerDeviceToken(token: string) { return this.request<void>("/member/device-token", { method: "POST", body: JSON.stringify({ token }) }); }
  removeDeviceToken(token: string) { return this.request<void>("/member/device-token", { method: "DELETE", body: JSON.stringify({ token }) }); }
  workspaces() { return this.request<Workspace[]>("/workspace"); }
  createWorkspace(input: { name: string; schoolCode?: string }) { return this.request<string>("/workspace", { method: "POST", body: JSON.stringify(input) }); }
  rooms(workspaceId: string, type: "group" | "personal" = "group") { return this.request<Room[]>(`/chat/${type}/search/${workspaceId}`); }
  createRoom(type: "group" | "personal", input: { workspaceId: string; name: string; memberIds: string[] }) { return this.request<string>(`/chat/${type}/create`, { method: "POST", body: JSON.stringify(input) }); }
  messages(roomId: string) { return this.request<{ messages: ChatMessage[]; hasNext: boolean }>(`/message/search/${roomId}`); }
  notifications(workspaceId: string) { return this.request<Notification[]>(`/notification/${workspaceId}`); }
  tasks(workspaceId: string) { return this.request<Task[]>(`/task/${workspaceId}`); }
  timetable(workspaceId: string) { return this.request<Timetable[]>(`/timetable/weekend?workspaceId=${workspaceId}`); }
  askCatSeugi(message: string) { return this.request<string>("/ai", { method: "POST", body: JSON.stringify({ message }) }); }
}
