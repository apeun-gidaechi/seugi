import type { LegacyProfile, Room, Timetable, Workspace } from "@seugi/contracts";

export const mockWorkspace: Workspace = {
  id: "playground-workspace",
  code: "DEMO01",
  name: "스기고등학교 (Demo)",
  members: ["member-1", "member-2"],
  waitlist: [],
  ownerId: "member-1",
  schoolType: "HIGH",
};

export const mockWorkspaces: Workspace[] = [
  mockWorkspace,
  {
    id: "playground-workspace-2",
    code: "DEMO02",
    name: "스기중학교 (Demo)",
    members: ["member-1"],
    waitlist: [],
    ownerId: "member-1",
  },
];

export const mockRoom: Room = {
  id: "playground-room",
  workspaceId: mockWorkspace.id,
  type: "GROUP",
  name: "3학년 1반",
  memberIds: ["member-1", "member-2"],
  adminId: "member-1",
  lastMessage: "내일 급식 메뉴 확인해 주세요",
  notReadCnt: 2,
};

export const mockTimetable: Timetable[] = [
  {
    id: "1",
    workspaceId: mockWorkspace.id,
    grade: "3",
    classNum: "1",
    time: "1",
    subject: "국어",
    date: new Date().toISOString().slice(0, 10),
  },
  {
    id: "2",
    workspaceId: mockWorkspace.id,
    grade: "3",
    classNum: "1",
    time: "2",
    subject: "수학",
    date: new Date().toISOString().slice(0, 10),
  },
];

export const mockLegacyProfile: LegacyProfile = {
  id: "member-1",
  email: "demo@seugi.app",
  name: "홍길동",
  workspaceId: mockWorkspace.id,
  role: "STUDENT",
  permission: "STUDENT",
  profileImage: "",
  member: {
    id: "member-1",
    email: "demo@seugi.app",
    birth: "2010-01-01",
    name: "홍길동",
    picture: null,
  },
  schGrade: 3,
  schClass: 1,
  schNumber: 12,
};

export const demoImageUri = "https://placehold.co/600x800/png?text=Seugi+Preview";
