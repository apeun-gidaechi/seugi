import type {
  ChatMessage,
  ClassroomTask,
  LegacyNotification,
  LegacyProfile,
  Meal,
  Member,
  PendingWorkspaceRequest,
  Room,
  Schedule,
  Task,
  Timetable,
  Workspace,
  WorkspaceMemberView,
  WorkspaceSearchSummary,
  WorkspaceWaitlistMember,
} from "@seugi/contracts";
import { mockLegacyProfile, mockRoom, mockTimetable, mockWorkspace } from "./mockData";

const today = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();

export const playgroundMember: Member = {
  id: "member-1",
  email: "demo@seugi.app",
  name: "김선생",
  picture: "",
  birth: "1990-01-01",
  role: "MIDDLE_ADMIN",
};

export const playgroundProfile: LegacyProfile = {
  ...mockLegacyProfile,
  id: playgroundMember.id,
  email: playgroundMember.email,
  name: playgroundMember.name,
  role: "MIDDLE_ADMIN",
  permission: "MIDDLE_ADMIN",
  member: {
    ...mockLegacyProfile.member,
    id: playgroundMember.id,
    email: playgroundMember.email,
    name: playgroundMember.name,
  },
};

export function playgroundWorkspaces(): Workspace[] {
  return [
    { ...mockWorkspace, ownerId: playgroundMember.id },
    {
      id: "playground-workspace-2",
      code: "DEMO02",
      name: "스기중학교 (Demo)",
      members: [playgroundMember.id],
      waitlist: [],
      ownerId: playgroundMember.id,
    },
  ];
}

function memberView(
  id: string,
  name: string,
  role: LegacyProfile["role"],
  grade?: number,
  classNum?: number,
  number?: number,
): WorkspaceMemberView {
  return {
    id,
    email: `${id}@seugi.app`,
    name,
    workspaceId: mockWorkspace.id,
    role,
    status: "APPROVED",
    permission: role,
    profileImage: "",
    schGrade: grade,
    schClass: classNum,
    schNumber: number,
    member: {
      id,
      email: `${id}@seugi.app`,
      name,
      nick: name,
      picture: "",
      spot: "",
      belong: "",
      phone: "",
      wire: "",
      location: "",
      permission: role,
      schGrade: grade,
      schClass: classNum,
      schNumber: number,
    },
  };
}

export const playgroundMembers: WorkspaceMemberView[] = [
  memberView("member-1", "김선생", "MIDDLE_ADMIN"),
  memberView("member-2", "이학생", "STUDENT", 3, 1, 12),
  memberView("member-3", "박학생", "STUDENT", 3, 1, 13),
];

export function playgroundRooms(): Room[] {
  return [
    mockRoom,
    {
      id: "playground-room-2",
      workspaceId: mockWorkspace.id,
      type: "GROUP",
      name: "교무실",
      memberIds: [playgroundMember.id, "member-2"],
      adminId: playgroundMember.id,
      lastMessage: "회의 3시",
      notReadCnt: 0,
    },
    {
      id: "playground-personal",
      workspaceId: mockWorkspace.id,
      type: "PERSONAL",
      name: "이학생",
      memberIds: [playgroundMember.id, "member-2"],
      adminId: playgroundMember.id,
      lastMessage: "네, 알겠습니다",
    },
  ];
}

export function playgroundMessages(roomId: string): ChatMessage[] {
  const stamp = nowIso();
  return [
    {
      id: "msg-1",
      roomId,
      senderId: "member-2",
      message: "선생님 안녕하세요!",
      createdAt: stamp,
      emojis: {},
      type: "MESSAGE",
    },
    {
      id: "msg-2",
      roomId,
      senderId: playgroundMember.id,
      message: "안녕, 오늘 과제 확인했니?",
      createdAt: stamp,
      emojis: { "👍": [playgroundMember.id] },
      type: "MESSAGE",
    },
  ];
}

export function playgroundTasks(): Task[] {
  return [
    {
      id: "task-1",
      workspaceId: mockWorkspace.id,
      title: "독서 감상문",
      content: "책 한 권 읽고 A4 1장 요약",
      dueDate: today(),
      createdAt: nowIso(),
    },
    {
      id: "task-2",
      workspaceId: mockWorkspace.id,
      title: "수학 워크시트 3장",
      dueDate: today(),
      createdAt: nowIso(),
    },
  ];
}

export function playgroundClassroomTasks(): ClassroomTask[] {
  return [
    {
      id: "ct-1",
      title: "Google Classroom: 영어 단어",
      dueDate: today(),
      link: "https://classroom.google.com",
    },
  ];
}

export function playgroundMeals(): Meal[] {
  const date = today();
  return [
    { date, type: "조식", menu: ["우유", "시리얼", "바나나"], calorie: "420" },
    { date, type: "중식", menu: ["김치찌개", "불고기", "밥", "깍두기"], calorie: "780" },
    { date, type: "석식", menu: ["잔치국수", "만두", "김치"], calorie: "650" },
  ];
}

export function playgroundSchedules(): Schedule[] {
  const date = today();
  return [
    { date, name: "체육대회", workspaceId: mockWorkspace.id },
    { date, name: "중간고사", workspaceId: mockWorkspace.id },
  ];
}

export function playgroundTimetable(): Timetable[] {
  return mockTimetable.map((row) => ({ ...row, date: today() }));
}

export function playgroundNotifications(): LegacyNotification[] {
  const stamp = nowIso();
  return [
    {
      id: "notice-1",
      workspaceId: mockWorkspace.id,
      title: "체육대회 안내",
      content: "다음 주 금요일 운동장에서 진행합니다.",
      authorId: playgroundMember.id,
      createdAt: stamp,
      emojis: {},
      userId: playgroundMember.id,
      userName: playgroundMember.name,
      emoji: [],
      createdDate: stamp,
      lastModifiedDate: stamp,
    },
    {
      id: "notice-2",
      workspaceId: mockWorkspace.id,
      title: "급식 알레르기 표",
      content: "알레르기 정보는 급식 카드에서 확인하세요.",
      authorId: playgroundMember.id,
      createdAt: stamp,
      emojis: {},
      userId: playgroundMember.id,
      userName: playgroundMember.name,
      emoji: [{ emoji: "❤️", userList: ["member-2"] }],
      createdDate: stamp,
      lastModifiedDate: stamp,
    },
  ];
}

export function playgroundSearchSummary(code: string): WorkspaceSearchSummary {
  return {
    workspaceId: mockWorkspace.id,
    workspaceName: mockWorkspace.name,
    workspaceImageUrl: "",
    studentCount: 320,
    teacherCount: 28,
  };
}

export function playgroundPendingRequests(): PendingWorkspaceRequest[] {
  return [
    {
      ...mockWorkspace,
      requestedRoles: ["STUDENT"],
    },
  ];
}

export function playgroundWaitlist(): WorkspaceWaitlistMember[] {
  return [
    {
      id: "wait-1",
      email: "pending@seugi.app",
      name: "가입대기",
      role: "STUDENT",
      permission: "STUDENT",
    },
  ];
}
