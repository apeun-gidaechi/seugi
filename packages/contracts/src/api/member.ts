import { query, route, segment } from "./helpers.js";

export const memberApiSpec = {
  registerMember: route("POST", "/member/register"),
  loginMember: route("POST", "/member/login"),
  editMember: route("PATCH", "/member/edit"),
  addDeviceToken: route("POST", "/member/device-token"),
  removeDeviceToken: route("DELETE", "/member/device-token"),
  logoutMember: route("POST", "/member/logout"),
  refreshMember: query(
    "GET",
    "/member/refresh",
    (token: string) => `/member/refresh?token=${segment(token)}`,
  ),
  memberInfo: route("GET", "/member/myInfo"),
  removeMember: route("DELETE", "/member/remove"),
} as const;
