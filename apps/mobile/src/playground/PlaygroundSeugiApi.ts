import { SeugiApi } from "@seugi/api-client";
import type { ApiResponse } from "@seugi/contracts";
import {
  playgroundClassroomTasks,
  playgroundMeals,
  playgroundMembers,
  playgroundMember,
  playgroundMessages,
  playgroundNotifications,
  playgroundPendingRequests,
  playgroundProfile,
  playgroundRooms,
  playgroundSchedules,
  playgroundSearchSummary,
  playgroundTasks,
  playgroundTimetable,
  playgroundWaitlist,
  playgroundWorkspaces,
} from "./playgroundApiFixtures";
import { mockRoom, mockWorkspace } from "./mockData";

const ok = <T>(data: T): Promise<ApiResponse<T>> =>
  Promise.resolve({ message: "playground", data });

const voidOk = (): Promise<ApiResponse<void>> => ok(undefined as void);

/** In-memory API used by the playground app variant (no backend required). */
export class PlaygroundSeugiApi extends SeugiApi {
  private noticeStore = playgroundNotifications();

  constructor(baseUrl: string) {
    super(baseUrl, "playground-access-token", "playground-refresh-token");
  }

  override workspaces() {
    return ok(playgroundWorkspaces());
  }

  override memberInfo() {
    return ok(playgroundMember);
  }

  override myProfile(_workspaceId: string) {
    return ok(playgroundProfile);
  }

  override profileOfOther(_workspaceId: string, memberId: string) {
    const member = playgroundMembers.find((item) => item.id === memberId);
    if (!member) return ok(playgroundProfile);
    return ok({
      ...playgroundProfile,
      id: member.id,
      name: member.name,
      role: member.role,
      permission: member.permission,
    });
  }

  override workspaceMembers(_workspaceId: string) {
    return ok(playgroundMembers);
  }

  override myWaitingWorkspaces() {
    return ok(playgroundPendingRequests());
  }

  override searchWorkspace(code: string) {
    return ok(playgroundSearchSummary(code));
  }

  override joinWorkspace() {
    return voidOk();
  }

  override workspaceCode() {
    return ok("DEMO01");
  }

  override waitlist() {
    return ok(playgroundWaitlist());
  }

  override approveWorkspaceMembers() {
    return voidOk();
  }

  override rejectWorkspaceMembers() {
    return voidOk();
  }

  override cancelMyWorkspaceRequest() {
    return voidOk();
  }

  override tasks(_workspaceId: string) {
    return ok(playgroundTasks());
  }

  override classroomTasks() {
    return ok(playgroundClassroomTasks());
  }

  override weeklyTimetable(_workspaceId: string) {
    return ok(playgroundTimetable());
  }

  override timetable(_workspaceId: string) {
    return ok(playgroundTimetable());
  }

  override mealForDate(_workspaceId: string, _date: string) {
    return ok(playgroundMeals());
  }

  override meals(_workspaceId: string) {
    return ok(playgroundMeals());
  }

  override schedulesForMonth(_workspaceId: string, _month: number) {
    return ok(playgroundSchedules());
  }

  override schedules(_workspaceId: string) {
    return ok(playgroundSchedules());
  }

  override rooms(_workspaceId: string, type: "group" | "personal" = "group") {
    const rooms = playgroundRooms().filter((room) =>
      type === "group" ? room.type === "GROUP" : room.type === "PERSONAL",
    );
    return ok(rooms);
  }

  override groupRoom(roomId: string) {
    const room = playgroundRooms().find((item) => item.id === roomId) ?? mockRoom;
    return ok(room);
  }

  override personalRoom(roomId: string) {
    const room =
      playgroundRooms().find((item) => item.id === roomId) ??
      playgroundRooms().find((item) => item.type === "PERSONAL")!;
    return ok(room);
  }

  override createRoom(type: "group" | "personal") {
    return ok(type === "group" ? "playground-room-new" : "playground-personal-new");
  }

  override messages(roomId: string) {
    return ok({ messages: playgroundMessages(roomId), hasNext: false });
  }

  override notifications(_workspaceId: string) {
    return ok(this.noticeStore);
  }

  override createNotification(input: { title: string; content: string; workspaceId: string }) {
    const stamp = new Date().toISOString();
    const notice = {
      id: `notice-${Date.now()}`,
      workspaceId: input.workspaceId,
      title: input.title,
      content: input.content,
      authorId: playgroundMember.id,
      createdAt: stamp,
      emojis: {},
      userId: playgroundMember.id,
      userName: playgroundMember.name,
      emoji: [],
      createdDate: stamp,
      lastModifiedDate: stamp,
    };
    this.noticeStore = [notice, ...this.noticeStore];
    return ok(notice);
  }

  override updateNotification() {
    return voidOk();
  }

  override deleteNotification(_workspaceId: string, id: string) {
    this.noticeStore = this.noticeStore.filter((item) => item.id !== id);
    return voidOk();
  }

  override toggleNotificationEmoji() {
    return voidOk();
  }

  override workspaceNotificationPreference() {
    return ok(true);
  }

  override setWorkspaceNotificationPreference() {
    return ok(true);
  }

  override registerDeviceToken() {
    return voidOk();
  }

  override removeDeviceToken() {
    return voidOk();
  }

  override createTask() {
    return voidOk();
  }

  override editProfile() {
    return voidOk();
  }

  override editMember() {
    return voidOk();
  }

  override editStudentNumber() {
    return voidOk();
  }

  override setWorkspaceMemberRole() {
    return voidOk();
  }

  override removeWorkspaceMember() {
    return voidOk();
  }

  override addGroupMembers() {
    return voidOk();
  }

  override leaveGroupRoom() {
    return voidOk();
  }

  override uploadFile() {
    return ok({
      name: "playground.png",
      type: "IMAGE",
      mimeType: "image/png",
      size: 1024,
      url: "https://placehold.co/400x400/png?text=Seugi",
    });
  }

  override addMessageEmoji() {
    return voidOk();
  }

  override removeMessageEmoji() {
    return voidOk();
  }

  override createWorkspace() {
    return ok(mockWorkspace.id);
  }

  override askCatSeugi(message: string) {
    return ok(`(캣스기) "${message}" — playground demo 응답입니다.`);
  }

  override logout() {
    return voidOk();
  }

  override removeMember() {
    return voidOk();
  }

  override login() {
    return ok({ accessToken: "playground-access-token", refreshToken: "playground-refresh-token" });
  }

  override register() {
    return this.login();
  }
}
