import type { HomeDetail } from "../screens/HomeScreen";
import type { WorkspaceSection } from "../screens/WorkspaceDetailScreen";
import type { SeugiTab } from "../design-system/BottomNavigation";

export type AppDetail =
  | HomeDetail
  | "createRoom"
  | "createGroupRoomName"
  | "createTask"
  | "createNotice"
  | "editNotice"
  | "accountSettings"
  | "workspaceJoinCode"
  | "workspaceJoinConfirm"
  | "workspaceJoinWaiting"
  | WorkspaceSection;

export const shellTabTitles: Record<SeugiTab, string> = {
  home: "홈",
  chat: "채팅",
  group: "단체",
  notice: "공지",
  profile: "내 프로필",
};

export const shellDetailTitles: Record<AppDetail, string> = {
  meals: "급식",
  timetable: "시간표",
  tasks: "과제",
  catSeugi: "캣스기",
  workspace: "내 학교",
  createRoom: "멤버 선택",
  createGroupRoomName: "채팅방 이름",
  createTask: "과제 만들기",
  createNotice: "공지 작성",
  editNotice: "공지 수정",
  accountSettings: "설정",
  workspaceGeneral: "일반",
  workspaceMembers: "멤버",
  workspaceInvite: "멤버 초대",
  workspaceNotifications: "알림 설정",
  workspaceCreate: "새 학교 등록",
  workspaceJoin: "학교 가입",
  workspaceJoinCode: "학교 가입",
  workspaceJoinConfirm: "학교 가입",
  workspaceJoinWaiting: "학교 가입",
};

export function isWorkspaceJoinDetail(detail?: AppDetail) {
  return (
    detail === "workspaceJoin" ||
    detail === "workspaceJoinCode" ||
    detail === "workspaceJoinConfirm" ||
    detail === "workspaceJoinWaiting"
  );
}

const shellFullscreenDetails: AppDetail[] = [
  "createNotice",
  "editNotice",
  "createRoom",
  "createGroupRoomName",
  "createTask",
];

export function shellShowsMainTopBar(
  detail: AppDetail | undefined,
  hasActiveConversation: boolean,
) {
  if (hasActiveConversation) return false;
  if (!detail) return true;
  if (shellFullscreenDetails.includes(detail)) return false;
  if (isWorkspaceJoinDetail(detail)) return false;
  return true;
}

export function shellRouteKey(tab: SeugiTab, detailStack: AppDetail[], activeConversationId?: string) {
  return `${tab}:${detailStack.join("/")}:${activeConversationId ?? ""}`;
}
