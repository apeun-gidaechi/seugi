import { randomUUID } from "node:crypto";
import type { ChatMessage, Member, Notification, Profile, Room, Schedule, Task, Timetable, Workspace } from "@seugi/contracts";

export class Store {
  members = new Map<string, Member & { password?: string; refreshToken?: string }>();
  profiles = new Map<string, Profile>();
  workspaces = new Map<string, Workspace>();
  rooms = new Map<string, Room>();
  messages = new Map<string, ChatMessage>();
  notifications = new Map<string, Notification>();
  timetables = new Map<string, Timetable>();
  tasks = new Map<string, Task>();
  schedules: Schedule[] = [];
  id() { return randomUUID(); }
  requireMember(id: string) { const value = this.members.get(id); if (!value) throw new Error("MEMBER_NOT_FOUND"); return value; }
  requireWorkspace(id: string) { const value = this.workspaces.get(id); if (!value) throw new Error("WORKSPACE_NOT_FOUND"); return value; }
  canAccess(workspaceId: string, memberId: string) { return this.requireWorkspace(workspaceId).members.includes(memberId); }
}
