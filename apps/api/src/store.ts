import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ChatMessage, Meal, Member, Notification, Profile, Room, Schedule, Task, Timetable, Workspace } from "@seugi/contracts";

export type StoreSnapshot = {
  members: Array<[string, Member & { password?: string; refreshToken?: string }]>;
  profiles: Array<[string, Profile]>;
  workspaces: Array<[string, Workspace]>;
  rooms: Array<[string, Room]>;
  messages: Array<[string, ChatMessage]>;
  notifications: Array<[string, Notification]>;
  timetables: Array<[string, Timetable]>;
  tasks: Array<[string, Task]>;
  schedules: Schedule[];
  meals: Array<[string, Meal[]]>;
  emailCodes: Array<[string, { code: string; expiresAt: number }]>;
  oauth: Array<[string, { provider: "google" | "apple"; accessToken: string; refreshToken?: string }]>;
  deviceTokens: Array<[string, string[]]>;
  waitlistRoles: Array<[string, "STUDENT" | "TEACHER" | "MIDDLE_ADMIN"]>;
  workspacePushPreferences: Array<[string, boolean]>;
};

/**
 * Domain storage with an optional atomic JSON persistence adapter. Production
 * deployments can use the PostgreSQL adapter without changing domain handlers.
 */
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
  meals = new Map<string, Meal[]>();
  emailCodes = new Map<string, { code: string; expiresAt: number }>();
  oauth = new Map<string, { provider: "google" | "apple"; accessToken: string; refreshToken?: string }>();
  deviceTokens = new Map<string, string[]>();
  waitlistRoles = new Map<string, "STUDENT" | "TEACHER" | "MIDDLE_ADMIN">();
  workspacePushPreferences = new Map<string, boolean>();
  constructor(private readonly filePath?: string) {}
  id() { return randomUUID(); }
  pushTokensForWorkspace(workspaceId: string, memberIds: string[], excludedMemberId?: string) { return memberIds.filter((id) => id !== excludedMemberId && this.workspacePushPreferences.get(`${workspaceId}:${id}`) !== false).flatMap((id) => this.deviceTokens.get(id) ?? []); }
  requireMember(id: string) { const value = this.members.get(id); if (!value) throw new Error("MEMBER_NOT_FOUND"); return value; }
  requireWorkspace(id: string) { const value = this.workspaces.get(id); if (!value) throw new Error("WORKSPACE_NOT_FOUND"); return value; }
  canAccess(workspaceId: string, memberId: string) { return this.requireWorkspace(workspaceId).members.includes(memberId); }
  load(): void | Promise<void> {
    if (!this.filePath || !existsSync(this.filePath)) return;
    const snapshot = JSON.parse(readFileSync(this.filePath, "utf8")) as StoreSnapshot;
    this.restore(snapshot);
  }
  restore(snapshot: StoreSnapshot) {
    this.members = new Map(snapshot.members ?? []); this.profiles = new Map(snapshot.profiles ?? []);
    this.workspaces = new Map(snapshot.workspaces ?? []); this.rooms = new Map(snapshot.rooms ?? []);
    this.messages = new Map(snapshot.messages ?? []); this.notifications = new Map(snapshot.notifications ?? []);
    this.timetables = new Map(snapshot.timetables ?? []); this.tasks = new Map(snapshot.tasks ?? []);
    this.schedules = snapshot.schedules ?? []; this.meals = new Map(snapshot.meals ?? []); this.emailCodes = new Map(snapshot.emailCodes ?? []); this.oauth = new Map(snapshot.oauth ?? []); this.deviceTokens = new Map(snapshot.deviceTokens ?? []); this.waitlistRoles = new Map(snapshot.waitlistRoles ?? []); this.workspacePushPreferences = new Map(snapshot.workspacePushPreferences ?? []);
  }
  snapshot(): StoreSnapshot {
    return { members: [...this.members], profiles: [...this.profiles], workspaces: [...this.workspaces], rooms: [...this.rooms], messages: [...this.messages], notifications: [...this.notifications], timetables: [...this.timetables], tasks: [...this.tasks], schedules: this.schedules, meals: [...this.meals], emailCodes: [...this.emailCodes], oauth: [...this.oauth], deviceTokens: [...this.deviceTokens], waitlistRoles: [...this.waitlistRoles], workspacePushPreferences: [...this.workspacePushPreferences] };
  }
  persist(): void | Promise<void> {
    if (!this.filePath) return;
    mkdirSync(dirname(this.filePath), { recursive: true });
    const snapshot = this.snapshot();
    const temporary = `${this.filePath}.tmp`;
    writeFileSync(temporary, JSON.stringify(snapshot), "utf8");
    renameSync(temporary, this.filePath);
  }
  async beginRequest() {}
  async rollbackRequest() {}
  async close() {}
  async withMutation<T>(operation: () => Promise<T> | T): Promise<T> {
    const result = await operation();
    await this.persist();
    return result;
  }
}
