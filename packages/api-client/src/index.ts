import { API_SPEC, type ApiResponse, type AuthenticateOAuthInput, type ChatMessage, type ChatMemberEventInput, type ClassroomTask, type ConnectGoogleInput, type CreateChatRoomInput, type CreateNotificationInput, type CreateTaskInput, type CreateTimetableInput, type CreateWorkspaceInput, type EditMemberInput, type EditProfileInput, type EditStudentNumberInput, type EmailVerificationInput, type JoinWorkspaceInput, type LegacyProfile, type LoginMemberInput, type LogoutMemberInput, type KickWorkspaceMembersInput, type Meal, type Member, type Notification, type RegisterMemberInput, type Room, type Role, type Schedule, type Task, type Timetable, type Tokens, type UpdateNotificationInput, type UpdateTimetableInput, type UpdateWorkspaceInput, type UpdateWorkspaceMemberRoleInput, type Workspace, type WorkspaceMemberChart, type WorkspaceMemberView, type WorkspaceSearchSummary, type WorkspaceWaitlistActionInput, type WorkspaceWaitlistMember } from "@seugi/contracts";

export class SeugiApi {
  private refreshToken?: string;
  private refreshInFlight?: Promise<string | undefined>;
  constructor(readonly baseUrl: string, private token?: string, refreshToken?: string) { this.refreshToken = refreshToken; }
  setToken(token?: string) { this.token = token; }
  setRefreshToken(token?: string) { this.refreshToken = token; }
  accessToken() { return this.token; }
  health() { return this.request<{ status: "ok" }>(API_SPEC.health.path); }
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
    if (!response.ok) throw new SeugiApiError(payload.message, response.status, payload);
    return payload;
  }
  sendVerification(email: string) { return this.request<void>(API_SPEC.sendVerification.pathFor(email)); }
  confirmVerification(input: EmailVerificationInput) { return this.request<void>(API_SPEC.confirmVerification.path, { method: API_SPEC.confirmVerification.method, body: JSON.stringify(input) }); }
  register(input: RegisterMemberInput) { return this.request<Tokens>(API_SPEC.registerMember.path, { method: API_SPEC.registerMember.method, body: JSON.stringify(input) }); }
  login(input: LoginMemberInput) { return this.request<Tokens>(API_SPEC.loginMember.path, { method: API_SPEC.loginMember.method, body: JSON.stringify(input) }); }
  authenticateGoogle(input: AuthenticateOAuthInput) { return this.request<Tokens>(API_SPEC.authenticateOAuth.pathFor("google"), { method: API_SPEC.authenticateOAuth.method, body: JSON.stringify(input) }); }
  authenticateApple(input: AuthenticateOAuthInput) { return this.request<Tokens>(API_SPEC.authenticateOAuth.pathFor("apple"), { method: API_SPEC.authenticateOAuth.method, body: JSON.stringify(input) }); }
  connectGoogle(input: ConnectGoogleInput) { return this.request<void>(API_SPEC.connectGoogle.path, { method: API_SPEC.connectGoogle.method, body: JSON.stringify(input) }); }
  googleConnection() { return this.request<boolean>(API_SPEC.googleConnection.path); }
  removeGoogleConnection() { return this.request<void>(API_SPEC.removeGoogleConnection.path, { method: API_SPEC.removeGoogleConnection.method }); }
  refreshAccessToken(refreshToken: string) { return this.request<string>(API_SPEC.refreshMember.pathFor(refreshToken), {}, false); }
  registerDeviceToken(token: string) { return this.request<void>(API_SPEC.addDeviceToken.path, { method: API_SPEC.addDeviceToken.method, body: JSON.stringify({ token }) }); }
  removeDeviceToken(token: string) { return this.request<void>(API_SPEC.removeDeviceToken.path, { method: API_SPEC.removeDeviceToken.method, body: JSON.stringify({ token }) }); }
  logout(deviceToken?: string, fcmToken?: string) { const input: LogoutMemberInput = { deviceToken, fcmToken }; return this.request<void>(API_SPEC.logoutMember.path, { method: API_SPEC.logoutMember.method, body: JSON.stringify(input) }); }
  removeMember() { return this.request<void>(API_SPEC.removeMember.path, { method: API_SPEC.removeMember.method }); }
  workspaces() { return this.request<Workspace[]>(API_SPEC.listWorkspaces.path); }
  myWaitingWorkspaces() { return this.request<Workspace[]>(API_SPEC.myWaitingWorkspaces.path); }
  cancelMyWorkspaceRequest(workspaceId: string) { const input: WorkspaceWaitlistActionInput = { workspaceId }; return this.request<void>(API_SPEC.rejectWorkspaceMembers.path, { method: API_SPEC.rejectWorkspaceMembers.method, body: JSON.stringify(input) }); }
  workspaceCode(workspaceId: string) { return this.request<string>(API_SPEC.workspaceCode.pathFor(workspaceId)); }
  searchWorkspace(code: string) { return this.request<WorkspaceSearchSummary>(API_SPEC.searchWorkspace.pathFor(code)); }
  workspaceDetails(workspaceId: string) { return this.request<Workspace>(API_SPEC.workspaceDetails.pathFor(workspaceId)); }
  deleteWorkspace(workspaceId: string) { return this.request<void>(API_SPEC.deleteWorkspace.pathFor(workspaceId), { method: API_SPEC.deleteWorkspace.method }); }
  memberInfo() { return this.request<Member>(API_SPEC.memberInfo.path); }
  editMember(input: EditMemberInput) { return this.request<void>(API_SPEC.editMember.path, { method: API_SPEC.editMember.method, body: JSON.stringify(input) }); }
  createWorkspace(input: CreateWorkspaceInput) { return this.request<string>(API_SPEC.createWorkspace.path, { method: API_SPEC.createWorkspace.method, body: JSON.stringify(input) }); }
  updateWorkspace(input: UpdateWorkspaceInput) { return this.request<void>(API_SPEC.updateWorkspace.path, { method: API_SPEC.updateWorkspace.method, body: JSON.stringify(input) }); }
  joinWorkspace(input: JoinWorkspaceInput) { return this.request<void>(API_SPEC.joinWorkspace.path, { method: API_SPEC.joinWorkspace.method, body: JSON.stringify(input) }); }
  workspaceMembers(workspaceId: string) { return this.request<WorkspaceMemberView[]>(API_SPEC.workspaceMembers.pathFor(workspaceId)); }
  workspaceMemberChart(workspaceId: string) { return this.request<WorkspaceMemberChart>(API_SPEC.workspaceMemberChart.pathFor(workspaceId)); }
  workspaceNotificationPreference(workspaceId: string) { return this.request<boolean>(API_SPEC.workspaceNotificationPreference.pathFor(workspaceId)); }
  setWorkspaceNotificationPreference(workspaceId: string, receivePush: boolean) { return this.request<boolean>(API_SPEC.setWorkspaceNotificationPreference.pathFor(workspaceId), { method: API_SPEC.setWorkspaceNotificationPreference.method, body: JSON.stringify({ receivePush }) }); }
  setWorkspaceMemberRole(workspaceId: string, memberId: string, role: Role) { const input: UpdateWorkspaceMemberRoleInput = { workspaceId, memberId, role }; return this.request<void>(API_SPEC.updateWorkspaceMemberRole.path, { method: API_SPEC.updateWorkspaceMemberRole.method, body: JSON.stringify(input) }); }
  removeWorkspaceMember(workspaceId: string, memberId: string) { const input: KickWorkspaceMembersInput = { workspaceId, memberId }; return this.request<void>(API_SPEC.kickWorkspaceMembers.path, { method: API_SPEC.kickWorkspaceMembers.method, body: JSON.stringify(input) }); }
  myProfile(workspaceId: string) { return this.request<LegacyProfile>(API_SPEC.myProfile.pathFor(workspaceId)); }
  profileOfOther(workspaceId: string, memberId: string) { return this.request<LegacyProfile>(API_SPEC.workspaceMember.pathFor(workspaceId, memberId)); }
  editProfile(workspaceId: string, input: EditProfileInput) { return this.request<void>(API_SPEC.editProfile.pathFor(workspaceId), { method: API_SPEC.editProfile.method, body: JSON.stringify(input) }); }
  editStudentNumber(workspaceId: string, input: EditStudentNumberInput) { return this.request<void>(API_SPEC.editStudentNumber.pathFor(workspaceId), { method: API_SPEC.editStudentNumber.method, body: JSON.stringify(input) }); }
  waitlist(workspaceId: string, role: Exclude<Role, "ADMIN">) { return this.request<WorkspaceWaitlistMember[]>(API_SPEC.workspaceWaitlist.pathFor(workspaceId, role)); }
  approveWorkspaceMember(workspaceId: string, memberId: string, role: Exclude<Role, "ADMIN">) { const input: WorkspaceWaitlistActionInput = { workspaceId, memberId, role }; return this.request<void>(API_SPEC.approveWorkspaceMembers.path, { method: API_SPEC.approveWorkspaceMembers.method, body: JSON.stringify(input) }); }
  rejectWorkspaceMember(workspaceId: string, memberId: string, role: Exclude<Role, "ADMIN">) { const input: WorkspaceWaitlistActionInput = { workspaceId, memberId, role }; return this.request<void>(API_SPEC.rejectWorkspaceMembers.path, { method: API_SPEC.rejectWorkspaceMembers.method, body: JSON.stringify(input) }); }
  approveWorkspaceMembers(workspaceId: string, memberIds: string[], role: Exclude<Role, "ADMIN">) { const input: WorkspaceWaitlistActionInput = { workspaceId, memberIds, role }; return this.request<void>(API_SPEC.approveWorkspaceMembers.path, { method: API_SPEC.approveWorkspaceMembers.method, body: JSON.stringify(input) }); }
  rejectWorkspaceMembers(workspaceId: string, memberIds: string[], role: Exclude<Role, "ADMIN">) { const input: WorkspaceWaitlistActionInput = { workspaceId, memberIds, role }; return this.request<void>(API_SPEC.rejectWorkspaceMembers.path, { method: API_SPEC.rejectWorkspaceMembers.method, body: JSON.stringify(input) }); }
  rooms(workspaceId: string, type: "group" | "personal" = "group") { const endpoint = type === "group" ? API_SPEC.groupRooms : API_SPEC.personalRooms; return this.request<Room[]>(endpoint.pathFor(workspaceId)); }
  searchRooms(workspaceId: string, word: string, type: "group" | "personal" = "group") { const endpoint = type === "group" ? API_SPEC.searchGroupRooms : API_SPEC.searchPersonalRooms; return this.request<Room[]>(endpoint.pathFor(workspaceId, word)); }
  createRoom(type: "group" | "personal", input: CreateChatRoomInput) { const endpoint = type === "group" ? API_SPEC.createGroupRoom : API_SPEC.createPersonalRoom; return this.request<string>(endpoint.path, { method: endpoint.method, body: JSON.stringify(input) }); }
  groupRoom(roomId: string) { return this.request<Room>(API_SPEC.groupRoom.pathFor(roomId)); }
  personalRoom(roomId: string) { return this.request<Room>(API_SPEC.personalRoom.pathFor(roomId)); }
  addGroupMembers(roomId: string, memberIds: string[]) { const input: ChatMemberEventInput = { roomId, memberIds }; return this.request<void>(API_SPEC.addGroupMembers.path, { method: API_SPEC.addGroupMembers.method, body: JSON.stringify(input) }); }
  removeGroupMembers(roomId: string, memberIds: string[]) { const input: ChatMemberEventInput = { roomId, memberIds }; return this.request<void>(API_SPEC.removeGroupMembers.path, { method: API_SPEC.removeGroupMembers.method, body: JSON.stringify(input) }); }
  transferGroupAdmin(roomId: string, memberId: string) { const input: ChatMemberEventInput = { roomId, memberId, memberIds: [] }; return this.request<void>(API_SPEC.transferGroupAdmin.path, { method: API_SPEC.transferGroupAdmin.method, body: JSON.stringify(input) }); }
  leaveGroupRoom(roomId: string) { return this.request<void>(API_SPEC.leaveGroupRoom.pathFor(roomId), { method: API_SPEC.leaveGroupRoom.method }); }
  uploadFile(type: "IMAGE" | "IMG" | "FILE" | "PROFILE" | "EMOJI", form: FormData) { return this.request<{ name: string; type: string; mimeType: string; size: number; byte?: number; url: string }>(API_SPEC.uploadFile.pathFor(type), { method: API_SPEC.uploadFile.method, body: form }); }
  messages(roomId: string, timestamp?: string) { return this.request<{ messages: ChatMessage[]; hasNext: boolean }>(API_SPEC.messages.pathFor(roomId, timestamp)); }
  addMessageEmoji(messageId: string, emoji: string) { return this.request<void>(API_SPEC.addMessageEmoji.path, { method: API_SPEC.addMessageEmoji.method, body: JSON.stringify({ messageId, emoji }) }); }
  removeMessageEmoji(messageId: string, emoji: string) { return this.request<void>(API_SPEC.removeMessageEmoji.path, { method: API_SPEC.removeMessageEmoji.method, body: JSON.stringify({ messageId, emoji }) }); }
  deleteMessage(roomId: string, messageId: string) { return this.request<void>(API_SPEC.deleteMessage.path, { method: API_SPEC.deleteMessage.method, body: JSON.stringify({ roomId, messageId }) }); }
  notifications(workspaceId: string) { return this.request<Notification[]>(API_SPEC.listNotifications.pathFor(workspaceId)); }
  createNotification(input: CreateNotificationInput) { return this.request<Notification>(API_SPEC.createNotification.path, { method: API_SPEC.createNotification.method, body: JSON.stringify(input) }); }
  updateNotification(input: UpdateNotificationInput) { return this.request<void>(API_SPEC.updateNotification.path, { method: API_SPEC.updateNotification.method, body: JSON.stringify(input) }); }
  deleteNotification(workspaceId: string, id: string) { return this.request<void>(API_SPEC.deleteNotification.pathFor(workspaceId, id), { method: API_SPEC.deleteNotification.method }); }
  toggleNotificationEmoji(notificationId: string, emoji: string) { return this.request<void>(API_SPEC.toggleNotificationEmoji.path, { method: API_SPEC.toggleNotificationEmoji.method, body: JSON.stringify({ notificationId, emoji }) }); }
  tasks(workspaceId: string) { return this.request<Task[]>(API_SPEC.listTasks.pathFor(workspaceId)); }
  createTask(input: CreateTaskInput) { return this.request<void>(API_SPEC.createTask.path, { method: API_SPEC.createTask.method, body: JSON.stringify(input) }); }
  classroomTasks() { return this.request<ClassroomTask[]>(API_SPEC.classroomTasks.path); }
  timetable(workspaceId: string) { return this.request<Timetable[]>(API_SPEC.dailyTimetable.pathFor(workspaceId)); }
  weeklyTimetable(workspaceId: string) { return this.request<Timetable[]>(API_SPEC.weeklyTimetable.pathFor(workspaceId)); }
  createTimetable(input: CreateTimetableInput) { return this.request<void>(API_SPEC.createTimetable.path, { method: API_SPEC.createTimetable.method, body: JSON.stringify(input) }); }
  updateTimetable(id: string, subject: string) { const input: UpdateTimetableInput = { id, subject }; return this.request<void>(API_SPEC.updateTimetable.path, { method: API_SPEC.updateTimetable.method, body: JSON.stringify(input) }); }
  deleteTimetable(id: string) { return this.request<void>(API_SPEC.deleteTimetable.pathFor(id), { method: API_SPEC.deleteTimetable.method }); }
  resetTimetable(workspaceId: string) { return this.request<void>(API_SPEC.resetTimetable.pathFor(workspaceId), { method: API_SPEC.resetTimetable.method }); }
  meals(workspaceId: string, year?: number, month?: number) { return this.request<Meal[]>(API_SPEC.meals.pathFor(workspaceId, year, month)); }
  mealForDate(workspaceId: string, date: string) { return this.request<Meal[]>(API_SPEC.mealForDate.pathFor(workspaceId, date)); }
  resetMeals(workspaceId: string) { return this.request<void>(API_SPEC.resetMeals.pathFor(workspaceId), { method: API_SPEC.resetMeals.method }); }
  schedules(workspaceId: string) { return this.request<Schedule[]>(API_SPEC.schedules.pathFor(workspaceId)); }
  schedulesForMonth(workspaceId: string, month: number) { return this.request<Schedule[]>(API_SPEC.monthSchedules.pathFor(workspaceId, month)); }
  askCatSeugi(message: string) { return this.request<string>(API_SPEC.askCatseugi.path, { method: API_SPEC.askCatseugi.method, body: JSON.stringify({ message }) }); }
}

export class SeugiApiError extends Error {
  constructor(message: string, readonly status: number, readonly response: ApiResponse<unknown>) {
    super(message);
    this.name = "SeugiApiError";
  }
}
