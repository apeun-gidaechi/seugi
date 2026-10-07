import type { ApiResponse, ChatMessage, ClassroomTask, Meal, Member, Notification, Profile, Room, Role, Schedule, Task, Timetable, Tokens, Workspace } from "@seugi/contracts";

export class SeugiApi {
  private refreshToken?: string;
  private refreshInFlight?: Promise<string | undefined>;
  constructor(readonly baseUrl: string, private token?: string, refreshToken?: string) { this.refreshToken = refreshToken; }
  setToken(token?: string) { this.token = token; }
  setRefreshToken(token?: string) { this.refreshToken = token; }
  accessToken() { return this.token; }
  private async request<T>(path: string, init: RequestInit = {}, retryAfterRefresh = true): Promise<ApiResponse<T>> {
    const multipart = typeof FormData !== "undefined" && init.body instanceof FormData;
    const requestToken = this.token;
    const response = await fetch(`${this.baseUrl.replace(/\/$/, "")}${path}`, { ...init, headers: { ...(!multipart ? { "content-type": "application/json" } : {}), ...(requestToken ? { authorization: `Bearer ${requestToken}` } : {}), ...init.headers } });
    const payload = await response.json() as ApiResponse<T>;
    if (response.status === 401 && retryAfterRefresh && this.refreshToken) {
      if (requestToken && requestToken !== this.token) return this.request<T>(path, init, false);
      if (!this.refreshInFlight) this.refreshInFlight = this.refreshAccessToken(this.refreshToken).then((result) => { if (result.data) this.token = result.data; return result.data; }).finally(() => { this.refreshInFlight = undefined; });
      const renewed = await this.refreshInFlight;
      if (renewed) return this.request<T>(path, init, false);
    }
    if (!response.ok) throw new Error(payload.message);
    return payload;
  }
  sendVerification(email: string) { return this.request<void>(`/email/send?email=${encodeURIComponent(email)}`); }
  register(input: { email: string; password: string; name?: string; code: string }) { return this.request<Tokens>("/member/register", { method: "POST", body: JSON.stringify(input) }); }
  login(input: { email: string; password: string; token?: string }) { return this.request<Tokens>("/member/login", { method: "POST", body: JSON.stringify(input) }); }
  authenticateGoogle(input: { code: string; platform: "ANDROID" | "IOS"; name?: string }) { return this.request<Tokens>("/oauth/google/authenticate", { method: "POST", body: JSON.stringify(input) }); }
  authenticateApple(input: { code: string; platform: "IOS"; name?: string }) { return this.request<Tokens>("/oauth/apple/authenticate", { method: "POST", body: JSON.stringify(input) }); }
  connectGoogle(input: { code: string; platform: "ANDROID" | "IOS" }) { return this.request<void>("/oauth/google/connect", { method: "POST", body: JSON.stringify(input) }); }
  googleConnection() { return this.request<boolean>("/oauth/google/status"); }
  removeGoogleConnection() { return this.request<void>("/oauth/google/remove", { method: "DELETE" }); }
  refreshAccessToken(refreshToken: string) { return this.request<string>(`/member/refresh?token=${encodeURIComponent(refreshToken)}`, {}, false); }
  registerDeviceToken(token: string) { return this.request<void>("/member/device-token", { method: "POST", body: JSON.stringify({ token }) }); }
  removeDeviceToken(token: string) { return this.request<void>("/member/device-token", { method: "DELETE", body: JSON.stringify({ token }) }); }
  logout(deviceToken?: string) { return this.request<void>("/member/logout", { method: "POST", body: JSON.stringify({ deviceToken }) }); }
  removeMember() { return this.request<void>("/member/remove", { method: "DELETE" }); }
  workspaces() { return this.request<Workspace[]>("/workspace"); }
  myWaitingWorkspaces() { return this.request<Workspace[]>("/workspace/my/wait-list"); }
  cancelMyWorkspaceRequest(workspaceId: string) { return this.request<void>("/workspace/cancel", { method: "DELETE", body: JSON.stringify({ workspaceId }) }); }
  workspaceCode(workspaceId: string) { return this.request<string>(`/workspace/code/${encodeURIComponent(workspaceId)}`); }
  memberInfo() { return this.request<Member>("/member/myInfo"); }
  editMember(input: { name?: string; picture?: string }) { return this.request<void>("/member/edit", { method: "PATCH", body: JSON.stringify(input) }); }
  createWorkspace(input: { name: string; schoolCode?: string; image?: string }) { return this.request<string>("/workspace", { method: "POST", body: JSON.stringify(input) }); }
  updateWorkspace(input: { workspaceId: string; name?: string; image?: string }) { return this.request<void>("/workspace", { method: "PATCH", body: JSON.stringify({ workspaceId: input.workspaceId, ...(input.name !== undefined ? { workspaceName: input.name } : {}), ...(input.image !== undefined ? { workspaceImgUrl: input.image } : {}) }) }); }
  joinWorkspace(input: { code: string; role?: "STUDENT" | "TEACHER" | "MIDDLE_ADMIN" }) { return this.request<void>("/workspace/join", { method: "POST", body: JSON.stringify(input) }); }
  workspaceMembers(workspaceId: string) { return this.request<Member[]>(`/workspace/members?workspaceId=${encodeURIComponent(workspaceId)}`); }
  workspaceNotificationPreference(workspaceId: string) { return this.request<boolean>(`/workspace/${encodeURIComponent(workspaceId)}/notifications`); }
  setWorkspaceNotificationPreference(workspaceId: string, receivePush: boolean) { return this.request<boolean>(`/workspace/${encodeURIComponent(workspaceId)}/notifications`, { method: "PATCH", body: JSON.stringify({ receivePush }) }); }
  setWorkspaceMemberRole(workspaceId: string, memberId: string, role: Role) { return this.request<void>("/workspace/permission", { method: "PATCH", body: JSON.stringify({ workspaceId, memberId, role }) }); }
  removeWorkspaceMember(workspaceId: string, memberId: string) { return this.request<void>("/workspace/kick", { method: "PATCH", body: JSON.stringify({ workspaceId, memberId }) }); }
  myProfile(workspaceId: string) { return this.request<Profile>(`/profile/me?workspaceId=${encodeURIComponent(workspaceId)}`); }
  editProfile(workspaceId: string, input: Partial<Pick<Profile, "grade" | "class" | "number" | "phone" | "status" | "nick" | "spot" | "belong" | "wire" | "location">>) { return this.request<void>(`/profile/${encodeURIComponent(workspaceId)}`, { method: "PATCH", body: JSON.stringify(input) }); }
  editStudentNumber(workspaceId: string, input: { grade: number; class: number; number: number }) { return this.request<void>(`/profile/schidnum/${encodeURIComponent(workspaceId)}`, { method: "PATCH", body: JSON.stringify(input) }); }
  waitlist(workspaceId: string, role: Exclude<Role, "ADMIN">) { return this.request<Member[]>(`/workspace/wait-list?workspaceId=${encodeURIComponent(workspaceId)}&role=${role}`); }
  approveWorkspaceMember(workspaceId: string, memberId: string, role: Exclude<Role, "ADMIN">) { return this.request<void>("/workspace/add", { method: "PATCH", body: JSON.stringify({ workspaceId, memberId, role }) }); }
  rejectWorkspaceMember(workspaceId: string, memberId: string, role: Exclude<Role, "ADMIN">) { return this.request<void>("/workspace/cancel", { method: "DELETE", body: JSON.stringify({ workspaceId, memberId, role }) }); }
  rooms(workspaceId: string, type: "group" | "personal" = "group") { return this.request<Room[]>(`/chat/${type}/search/${workspaceId}`); }
  searchRooms(workspaceId: string, word: string, type: "group" | "personal" = "group") { return this.request<Room[]>(`/chat/${type}/search?workspace=${encodeURIComponent(workspaceId)}&word=${encodeURIComponent(word)}`); }
  createRoom(type: "group" | "personal", input: { workspaceId: string; name: string; memberIds: string[] }) { return this.request<string>(`/chat/${type}/create`, { method: "POST", body: JSON.stringify(input) }); }
  groupRoom(roomId: string) { return this.request<Room>(`/chat/group/search/room/${encodeURIComponent(roomId)}`); }
  addGroupMembers(roomId: string, memberIds: string[]) { return this.request<void>("/chat/group/member/add", { method: "POST", body: JSON.stringify({ roomId, memberIds }) }); }
  removeGroupMembers(roomId: string, memberIds: string[]) { return this.request<void>("/chat/group/member/kick", { method: "PATCH", body: JSON.stringify({ roomId, memberIds }) }); }
  transferGroupAdmin(roomId: string, memberId: string) { return this.request<void>("/chat/group/member/toss", { method: "PATCH", body: JSON.stringify({ roomId, memberId, memberIds: [] }) }); }
  leaveGroupRoom(roomId: string) { return this.request<void>(`/chat/group/left/${encodeURIComponent(roomId)}`, { method: "PATCH" }); }
  uploadFile(type: "IMAGE" | "FILE" | "PROFILE", form: FormData) { return this.request<{ name: string; type: string; mimeType: string; size: number; url: string }>(`/file/upload/${type}`, { method: "POST", body: form }); }
  messages(roomId: string, timestamp?: string) { const cursor = timestamp ? `?timestamp=${encodeURIComponent(timestamp)}` : ""; return this.request<{ messages: ChatMessage[]; hasNext: boolean }>(`/message/search/${roomId}${cursor}`); }
  addMessageEmoji(messageId: string, emoji: string) { return this.request<void>("/message/emoji", { method: "PUT", body: JSON.stringify({ messageId, emoji }) }); }
  removeMessageEmoji(messageId: string, emoji: string) { return this.request<void>("/message/emoji", { method: "DELETE", body: JSON.stringify({ messageId, emoji }) }); }
  deleteMessage(roomId: string, messageId: string) { return this.request<void>("/message/delete", { method: "DELETE", body: JSON.stringify({ roomId, messageId }) }); }
  notifications(workspaceId: string) { return this.request<Notification[]>(`/notification/${workspaceId}`); }
  createNotification(input: { workspaceId: string; title: string; content: string }) { return this.request<Notification>("/notification", { method: "POST", body: JSON.stringify(input) }); }
  updateNotification(input: { id: string; workspaceId: string; title: string; content: string }) { return this.request<void>("/notification", { method: "PATCH", body: JSON.stringify(input) }); }
  deleteNotification(workspaceId: string, id: string) { return this.request<void>(`/notification/${encodeURIComponent(workspaceId)}/${encodeURIComponent(id)}`, { method: "DELETE" }); }
  toggleNotificationEmoji(notificationId: string, emoji: string) { return this.request<void>("/notification/emoji", { method: "PATCH", body: JSON.stringify({ notificationId, emoji }) }); }
  tasks(workspaceId: string) { return this.request<Task[]>(`/task/${workspaceId}`); }
  createTask(input: { workspaceId: string; title: string; content?: string; dueDate?: string }) { return this.request<void>("/task", { method: "POST", body: JSON.stringify(input) }); }
  classroomTasks() { return this.request<ClassroomTask[]>("/task/classroom"); }
  timetable(workspaceId: string) { return this.request<Timetable[]>(`/timetable/day?workspaceId=${encodeURIComponent(workspaceId)}`); }
  weeklyTimetable(workspaceId: string) { return this.request<Timetable[]>(`/timetable/weekend?workspaceId=${encodeURIComponent(workspaceId)}`); }
  createTimetable(input: Omit<Timetable, "id">) { return this.request<void>("/timetable", { method: "POST", body: JSON.stringify(input) }); }
  updateTimetable(id: string, subject: string) { return this.request<void>("/timetable", { method: "PATCH", body: JSON.stringify({ id, subject }) }); }
  deleteTimetable(id: string) { return this.request<void>(`/timetable/${encodeURIComponent(id)}`, { method: "DELETE" }); }
  resetTimetable(workspaceId: string) { return this.request<void>(`/timetable/reset?workspaceId=${encodeURIComponent(workspaceId)}`, { method: "POST" }); }
  meals(workspaceId: string, year?: number, month?: number) { const range = year !== undefined && month !== undefined ? `&year=${year}&month=${month}` : ""; return this.request<Meal[]>(`/meal/all?workspaceId=${encodeURIComponent(workspaceId)}${range}`); }
  schedules(workspaceId: string) { return this.request<Schedule[]>(`/schedule/${encodeURIComponent(workspaceId)}`); }
  askCatSeugi(message: string) { return this.request<string>("/ai", { method: "POST", body: JSON.stringify({ message }) }); }
}
